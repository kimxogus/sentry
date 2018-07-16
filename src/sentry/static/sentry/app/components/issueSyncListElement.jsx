import PropTypes from 'prop-types';
import React from 'react';
import styled from 'react-emotion';
import InlineSvg from 'app/components/inlineSvg';
import space from 'app/styles/space';

class IssueSyncElement extends React.Component {
  static propTypes = {
    externalIssueLink: PropTypes.string,
    externalIssueId: PropTypes.string,
    issue: PropTypes.object,
    openModal: PropTypes.func,
    onClose: PropTypes.func,
    integrationType: PropTypes.oneOf(['github', 'github_enterprise', 'jira', 'vsts']),
  };

  static defaultProps = {
    externalIssueLink: '#',
  };

  isLinked() {
    return this.props.issue;
  }

  handleClick = evt => {
    return this.props.openModal();
  };

  handleDelete = evt => {
    const issue = this.props.externalIssueId;
    return this.props.onClose(issue);
  };

  getIcon() {
    switch (this.props.integrationType) {
      case 'github':
        return <IntegrationIcon src="icon-github" />;
      case 'github_enterprise':
        return <IntegrationIcon src="icon-github" />;
      case 'jira':
        return <IntegrationIcon src="icon-jira" />;
      case 'vsts':
        return <IntegrationIcon src="icon-vsts" />;
      default:
        return null;
    }
  }

  getPrefix() {
    switch (this.props.integrationType) {
      case 'github':
        return 'GH-';
      case 'github_enterprise':
        return 'GHE-';
      case 'jira':
        return 'JIRA-';
      case 'vsts':
        return 'VSTS-';
      default:
        return null;
    }
  }

  getText() {
    return this.isLinked() ? (
      <IntegrationLink href={this.props.externalIssueLink}>
        {`${this.getPrefix()}${this.props.externalIssueId}`}
      </IntegrationLink>
    ) : (
      <IntegrationLink onClick={this.handleClick}>
        Link <IntegrationName>{this.props.integrationType}</IntegrationName> Issue
      </IntegrationLink>
    );
  }

  render() {
    return (
      <IssueSyncListElementContainer>
        <div>
          {this.getIcon()}
          {this.getText()}
        </div>
        <IconClose
          src="icon-close"
          onClick={this.handleDelete}
          isLinked={this.isLinked()}
        />
      </IssueSyncListElementContainer>
    );
  }
}

const IssueSyncListElementContainer = styled('div')`
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space(1.5)} ${space(1)};
`;

const IntegrationIcon = styled(InlineSvg)`
  color: ${p => p.theme.gray4};
  width: ${space(3)};
  height: ${space(3)};
`;

const IntegrationLink = styled('a')`
  text-decoration: none;
  padding-bottom: ${space(0.25)};
  margin-left: ${space(1)};
  color: ${p => p.theme.gray4};
  border-bottom: 1px solid ${p => p.theme.gray4};

  &,
  &:hover {
    border-bottom: 1px solid ${p => p.theme.linkColor};
  }
`;

const IntegrationName = styled('span')`
  text-transform: capitalize;
`;

const IconClose = styled(InlineSvg)`
  height: 1.25rem;
  color: ${p => p.theme.gray4};
  transition: 0.2s transform;
  ${p => (p.isLinked ? '' : 'transform: rotate(45deg) scale(0.75);')};
`;

export default IssueSyncElement;