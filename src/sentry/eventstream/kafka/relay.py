from __future__ import absolute_import

import logging
import uuid

from confluent_kafka import Consumer, OFFSET_BEGINNING, TopicPartition

from sentry.utils import json
from sentry.eventstream.kafka.state import PartitionState, SynchronizedPartitionStateManager


logger = logging.getLogger(__name__)


def join(consumers, timeout=0.0, throttle=0.1):
    i = 0
    while True:
        for consumer in consumers:
            message = consumer.poll(timeout if i < len(consumers) else timeout + throttle)
            if message is None:
                i = max(i + 1, len(consumers))
                continue

            error = message.error()
            if error is not None:
                raise Exception(error)

            yield (consumer, message)
            i = 0


def relay(bootstrap_servers, events_topic, events_consumer_group, commit_log_topic, synchronize_commit_group):
    def commit_callback(error, partitions):
        if error is not None:
            logger.warning('Failed to commit offsets (error: %s, partitions: %r)', error, partitions)

    events_consumer = Consumer({
        'bootstrap.servers': bootstrap_servers,
        'group.id': events_consumer_group,
        'enable.auto.commit': 'false',
        'enable.auto.offset.store': 'true',
        'enable.partition.eof': 'false',
        'default.topic.config': {
            'auto.offset.reset': 'error',
        },
        'on_commit': commit_callback,
    })

    def on_partition_state_change(topic, partition, previous_state_and_offsets, current_state_and_offsets):
        logger.debug('State change for %r: %r to %r', (topic, partition), previous_state_and_offsets, current_state_and_offsets)

        current_state, current_offsets = current_state_and_offsets
        if current_offsets.local is None:
            return  # it only makes sense to manipulate the consumer if we've got an assignment

        if current_state in (PartitionState.UNKNOWN, PartitionState.SYNCHRONIZED, PartitionState.REMOTE_BEHIND):
            consumer.pause([TopicPartition(topic, partition, current_offsets.local)])
        elif current_state is PartitionState.LOCAL_BEHIND:
            consumer.resume([TopicPartition(topic, partition, current_offsets.local)])
        else:
            raise NotImplementedError('Unexpected partition state: %s' % (current_state,))

    partition_state_manager = SynchronizedPartitionStateManager(on_partition_state_change)

    def get_initial_offset(consumer, i):
        low, high = consumer.get_watermark_offsets(i)
        return low

    def pause_partitions_on_assignment(consumer, assignment):
        assignment = [
            TopicPartition(
                i.topic,
                i.partition,
                i.offset if i.offset > -1 else get_initial_offset(consumer, i),
            ) for i in assignment
        ]

        consumer.assign(assignment)

        for i in assignment:
            partition_state_manager.set_local_offset(i.topic, i.partition, i.offset)

    events_consumer.subscribe(
        [events_topic],
        on_assign=pause_partitions_on_assignment,
    )

    commit_log_consumer = Consumer({
        'bootstrap_servers': bootstrap_servers,
        'group.id': '{}:sync:{}'.format(events_consumer_group, uuid.uuid1.hex()),
        'enable.auto.commit': 'false',
        'enable.auto.offset.store': 'true',
        'enable.partition.eof': 'false',
        'default.topic.config': {
            'auto.offset.reset': 'error',
        },
    })

    def rewind_partitions_on_assignment(consumer, assignment):
        consumer.assign([TopicPartition(i.topic, i.partition, OFFSET_BEGINNING) for i in assignment])

    commit_log_consumer.subscribe(
        [commit_log_topic],
        on_assign=rewind_partitions_on_assignment,
    )

    for consumer, message in join([commit_log_topic, events_consumer]):
        if consumer is events_consumer:
            assert message.topic() == events_topic
            partition_state_manager.validate_local_message(message.topic(), message.partition(), message.offset())
            raise NotImplementedError  # TODO: Schedule the post-processing job.
            consumer.commit(message=message)
            partition_state_manager.set_local_offset(message.topic(), message.partition(), message.offset() + 1)
        elif consumer is commit_log_consumer:
            assert message.topic() == commit_log_topic
            group, topic, partition = message.key().decode('utf-8').split(':', 3)
            partition = int(partition)
            if group != synchronize_commit_group:
                logger.debug('Received consumer offsets update from %r, ignoring...', group)
            else:
                offset = int(message.value().decode('utf-8'))
                partition_state_manager.set_remote_offset(topic, partition, offset)
        else:
            raise Exception('Recieved message from an unexpected consumer!')
