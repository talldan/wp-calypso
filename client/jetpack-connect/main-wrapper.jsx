/** @format */
/**
 * External dependencies
 */
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

/**
 * Internal dependencies
 */
import JetpackLogo from 'components/jetpack-logo';
import Main from 'components/main';
import { retrieveMobileRedirect } from './persistence-utils';

const JetpackConnectMainWrapper = ( { isWide, className, children } ) => {
	const wrapperClassName = classNames( 'jetpack-connect__main', {
		'is-wide': isWide,
		'is-mobile-app-flow': !! retrieveMobileRedirect(),
	} );
	return (
		<Main className={ classNames( className, wrapperClassName ) }>
			<div className="jetpack-connect__main-logo">
				<JetpackLogo full size={ 45 } />
			</div>
			{ children }
		</Main>
	);
};

JetpackConnectMainWrapper.propTypes = {
	isWide: PropTypes.bool,
};

JetpackConnectMainWrapper.defaultProps = {
	isWide: false,
};

export default JetpackConnectMainWrapper;
