import React from 'react';
import {mount} from 'enzyme';

import Feature from 'app/components/feature';

describe('Feature', function() {
  const organization = TestStubs.Organization({
    features: ['org-foo', 'org-bar', 'bar'],
    access: ['project:write', 'project:read'],
  });
  const project = TestStubs.Project({
    features: ['project-foo', 'project-bar'],
  });
  const routerContext = TestStubs.routerContext([
    {
      organization,
      project,
    },
  ]);

  describe('as render prop', function() {
    let childrenMock = jest.fn().mockReturnValue(null);
    beforeEach(function() {
      childrenMock.mockClear();
    });

    it('has feature (has access because optional)', function() {
      mount(
        <Feature feature={['org-foo', 'project-foo']}>{childrenMock}</Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: true,
        hasAccess: true,
      });
    });

    it('has accesss (has feature because optional)', function() {
      mount(
        <Feature access={['project:write', 'project:read']}>{childrenMock}</Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: true,
        hasAccess: true,
      });
    });

    it('has feature and access', function() {
      mount(
        <Feature
          feature={['org-foo', 'project-foo']}
          access={['project:write', 'project:read']}
        >
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: true,
        hasAccess: true,
      });
    });

    it('has feature but no access', function() {
      mount(
        <Feature feature={['org-foo', 'project-foo']} access={['org:write']}>
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: true,
        hasAccess: false,
      });
    });

    it('has access but no feature', function() {
      mount(
        <Feature feature={['org-baz']} access={['project:write']}>
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: false,
        hasAccess: true,
      });
    });

    it('has no access and no feature', function() {
      mount(
        <Feature feature={['org-baz']} access={['org:write']}>
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: false,
        hasAccess: false,
      });
    });

    it('can specify org from props', function() {
      mount(
        <Feature
          organization={TestStubs.Organization({access: ['org:write']})}
          access={['org:write']}
        >
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: true,
        hasAccess: true,
      });
    });

    it('can specify project from props', function() {
      mount(
        <Feature
          project={TestStubs.Project({features: ['project-baz']})}
          feature={['project-baz']}
        >
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: true,
        hasAccess: true,
      });
    });

    it('handles no org/project', function() {
      mount(
        <Feature
          organization={null}
          project={null}
          access={['org:write']}
          feature={['org-foo', 'project-foo']}
        >
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: false,
        hasAccess: false,
      });
    });

    it('handles features prefixed with org/project', function() {
      mount(
        <Feature
          organization={organization}
          project={project}
          feature={['organization:bar']}
        >
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: true,
        hasAccess: true,
      });

      mount(
        <Feature organization={organization} project={project} feature={['project:bar']}>
          {childrenMock}
        </Feature>,
        routerContext
      );

      expect(childrenMock).toHaveBeenCalledWith({
        hasFeature: false,
        hasAccess: true,
      });
    });
  });

  describe('as React node', function() {
    let wrapper;

    it('has features and access', function() {
      wrapper = mount(
        <Feature feature={['org-bar']} access={['project:write']}>
          <div>The Child</div>
        </Feature>,
        routerContext
      );

      expect(wrapper.find('Feature div').text()).toBe('The Child');
    });

    it('has no features or no access', function() {
      wrapper = mount(
        <Feature feature={['org-baz']} access={['org:write']}>
          <div>The Child</div>
        </Feature>,
        routerContext
      );

      expect(wrapper.find('Feature div')).toHaveLength(0);
    });
  });
});
