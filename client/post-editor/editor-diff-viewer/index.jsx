/** @format */

/**
 * External dependencies
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { debounce, filter, first, flow, get, has, last, map, partial, throttle } from 'lodash';
import { localize } from 'i18n-calypso';
import Gridicon from 'gridicons';

/**
 * Internal dependencies
 */
import { getPostRevision } from 'state/selectors';
import TextDiff from 'components/text-diff';
import scrollTo from 'lib/scroll-to';
import { recordTracksEvent } from 'state/analytics/actions';

const getCenterOffset = node => get( node, 'offsetTop', 0 ) + get( node, 'offsetHeight', 0 ) / 2;

class EditorDiffViewer extends PureComponent {
	static propTypes = {
		postId: PropTypes.number.isRequired,
		selectedRevisionId: PropTypes.number,
		siteId: PropTypes.number.isRequired,
		diff: PropTypes.shape( {
			post_content: PropTypes.array,
			post_title: PropTypes.array,
			totals: PropTypes.object,
		} ).isRequired,

		// connected to dispatch
		recordTracksEvent: PropTypes.func.isRequired,

		// localize
		translate: PropTypes.func.isRequired,
	};

	state = {
		changeOffsets: [],
		scrollTop: 0,
		viewportHeight: 0,
	};

	componentDidMount() {
		this.tryScrollingToFirstChangeOrTop();
		if ( typeof window !== 'undefined' ) {
			window.addEventListener( 'resize', this.debouncedRecomputeChanges );
		}
	}

	componentWillUnmount() {
		if ( typeof window !== 'undefined' ) {
			window.removeEventListener( 'resize', this.debouncedRecomputeChanges );
		}
	}

	componentDidUpdate() {
		this.tryScrollingToFirstChangeOrTop();
	}

	componentWillReceiveProps( nextProps ) {
		if ( nextProps.selectedRevisionId !== this.props.selectedRevisionId ) {
			this.setState( { changeOffsets: [] } );
		}
	}

	lastScolledRevisionId = null;

	tryScrollingToFirstChangeOrTop = () => {
		if (
			! this.props.selectedRevisionId ||
			this.props.selectedRevisionId === this.lastScolledRevisionId
		) {
			return;
		}

		// save revisionId so we don't scroll again, unless it changes
		this.lastScolledRevisionId = this.props.selectedRevisionId;

		this.recomputeChanges( () => {
			this.centerScrollingOnOffset( this.state.changeOffsets[ 0 ] || 0, false );
		} );
	};

	recomputeChanges = callback => {
		const diffNodes = this.node.querySelectorAll( '.text-diff__additions, .text-diff__deletions' );
		this.setState(
			{
				changeOffsets: map( diffNodes, getCenterOffset ),
				viewportHeight: get( this.node, 'offsetHeight', 0 ),
				scrollTop: get( this.node, 'scrollTop', 0 ),
			},
			callback
		);
	};

	debouncedRecomputeChanges = debounce( partial( this.recomputeChanges, null ), 500 );

	centerScrollingOnOffset = ( offset, animated = true ) => {
		const nextScrollTop = Math.max( 0, offset - this.state.viewportHeight / 2 );

		if ( ! animated ) {
			this.node.scrollTop = nextScrollTop;
			return;
		}

		scrollTo( {
			container: this.node,
			x: 0,
			y: nextScrollTop,
		} );
	};

	handleScroll = e => {
		this.setState( {
			scrollTop: get( e.target, 'scrollTop', 0 ),
		} );
	};

	throttledScrollHandler = throttle( this.handleScroll, 100 );

	handleScrollableRef = node => {
		if ( node ) {
			this.node = node;
			this.node.addEventListener( 'scroll', this.throttledScrollHandler );
		} else {
			this.node.removeEventListener( 'scroll', this.throttledScrollHandler );
			this.node = null;
		}
	};

	scrollAbove = () => {
		this.centerScrollingOnOffset( last( this.changesAboveViewport ) );
		this.props.recordTracksEvent( 'calypso_editor_post_revisions_scroll_hint_used', {
			direction: 'above',
		} );
	};

	scrollBelow = () => {
		this.centerScrollingOnOffset( first( this.changesBelowViewport ) );
		this.props.recordTracksEvent( 'calypso_editor_post_revisions_scroll_hint_used', {
			direction: 'below',
		} );
	};

	render() {
		const { diff } = this.props;
		const classes = classNames( 'editor-diff-viewer', {
			'is-loading': ! has( diff, 'post_content' ) && ! has( diff, 'post_title' ),
		} );

		const bottomBoundary = this.state.scrollTop + this.state.viewportHeight;

		// saving to `this` so we can access if from `scrollAbove` and `scrollBelow`
		this.changesAboveViewport = filter(
			this.state.changeOffsets,
			offset => offset < this.state.scrollTop
		);
		this.changesBelowViewport = filter(
			this.state.changeOffsets,
			offset => offset > bottomBoundary
		);

		const showHints = this.state.viewportHeight > 470;
		const countAbove = this.changesAboveViewport.length;
		const countBelow = this.changesBelowViewport.length;

		return (
			<div className={ classes }>
				<div className="editor-diff-viewer__scrollable" ref={ this.handleScrollableRef }>
					<h1 className="editor-diff-viewer__title">
						<TextDiff operations={ diff.post_title } />
					</h1>
					<pre className="editor-diff-viewer__content">
						<TextDiff operations={ diff.post_content } splitLines />
					</pre>
				</div>
				{ showHints &&
					countAbove > 0 && (
						<div className="editor-diff-viewer__hint-above" onClick={ this.scrollAbove }>
							<Gridicon className="editor-diff-viewer__hint-icon" size={ 18 } icon="arrow-up" />
							{ this.props.translate( '%(numberOfChanges)d change', '%(numberOfChanges)d changes', {
								args: { numberOfChanges: countAbove },
								count: countAbove,
							} ) }
						</div>
					) }
				{ showHints &&
					countBelow > 0 && (
						<div className="editor-diff-viewer__hint-below" onClick={ this.scrollBelow }>
							<Gridicon className="editor-diff-viewer__hint-icon" size={ 18 } icon="arrow-down" />
							{ this.props.translate( '%(numberOfChanges)d change', '%(numberOfChanges)d changes', {
								args: { numberOfChanges: countBelow },
								count: countBelow,
							} ) }
						</div>
					) }
			</div>
		);
	}
}

export default flow(
	localize,
	connect(
		( state, { siteId, postId, selectedRevisionId } ) => ( {
			revision: getPostRevision( state, siteId, postId, selectedRevisionId, 'display' ),
		} ),
		{ recordTracksEvent }
	)
)( EditorDiffViewer );
