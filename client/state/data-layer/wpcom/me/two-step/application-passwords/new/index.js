/** @format */

/**
 * External dependencies
 */
import { translate } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import schema from './schema';
import { APPLICATION_PASSWORD_CREATE } from 'state/action-types';
import { dispatchRequestEx, makeParser } from 'state/data-layer/wpcom-http/utils';
import { errorNotice } from 'state/notices/actions';
import { http } from 'state/data-layer/wpcom-http/actions';
import {
	createApplicationPasswordSuccess,
	requestApplicationPasswords,
} from 'state/application-passwords/actions';

export const apiTransformer = data => data.application_password;

/**
 * Dispatches a request to add an application password for the current user
 *
 * @param   {Object} action Redux action
 * @returns {Object} Dispatched http action
 */
export const addApplicationPassword = action =>
	http(
		{
			apiVersion: '1.1',
			method: 'POST',
			path: '/me/two-step/application-passwords/new',
			body: {
				application_name: action.applicationName,
			},
		},
		action
	);

/**
 * Dispatches the following actions when the request succeeded:
 * - a create application password success action
 * - a user application passwords receive action
 *
 * @param   {Object} action Redux action
 * @param   {Array}  data   Response from the endpoint
 * @returns {Array}         Dispatched actions
 */
export const handleAddSuccess = ( action, appPassword ) => [
	createApplicationPasswordSuccess( appPassword ),
	requestApplicationPasswords(),
];

/**
 * Dispatches an error notice when the request failed.
 *
 * @returns {Object} Dispatched error notice action
 */
export const handleAddError = () =>
	errorNotice(
		translate( 'There was a problem creating your application password. Please try again.' ),
		{
			duration: 8000,
		}
	);

export default {
	[ APPLICATION_PASSWORD_CREATE ]: [
		dispatchRequestEx( {
			fetch: addApplicationPassword,
			onSuccess: handleAddSuccess,
			onError: handleAddError,
			fromApi: makeParser( schema, {}, apiTransformer ),
		} ),
	],
};
