/**
 * WordPress Dependencies
 */
import { Notice } from '@wordpress/components';
import {
	BlockPreview,
	RecursionProvider,
	useBlockProps,
	Warning,
} from '@wordpress/block-editor';

/**
 * Internal Dependencies
 */
import { useSyncedEntityPreviewEdit } from '@prc/hooks';

function isBlockListEmpty(blocks) {
	return !blocks.length;
}

function SyncedEntityPreview({
	blocks,
	labels,
	isShrinkWrapped,
	stablePreviewWidth,
	previewResizeListener,
	isEmpty = isBlockListEmpty,
}) {
	if (isEmpty(blocks)) {
		return <p>{labels.emptyLabel}</p>;
	}

	if (isShrinkWrapped) {
		return (
			<div
				style={{
					position: 'relative',
					width: `${stablePreviewWidth}px`,
					maxWidth: '100%',
				}}
			>
				<BlockPreview.Async>
					<BlockPreview
						blocks={blocks}
						viewportWidth={stablePreviewWidth}
					/>
				</BlockPreview.Async>
			</div>
		);
	}

	return (
		<div style={{ position: 'relative', width: '100%' }}>
			{previewResizeListener}
			<BlockPreview.Async>
				<BlockPreview
					blocks={blocks}
					viewportWidth={stablePreviewWidth}
				/>
			</BlockPreview.Async>
		</div>
	);
}

export default function SyncedEntityEdit({
	attributes,
	setAttributes,
	postType,
	presenceMessages,
	presenceNoticeClassName,
	presenceDebug = false,
	resolveEffectiveRef,
	getShrinkWrapWidth,
	renderNotices,
	renderBeforePreview,
	labels,
	Controls,
	Placeholder,
	placeholderProps = {},
	controlsProps = {},
	isEmpty,
}) {
	const { ref, align } = attributes;

	const hookState = useSyncedEntityPreviewEdit({
		postType,
		ref,
		align,
		presenceMessages,
		presenceDebug,
		resolveEffectiveRef,
		getShrinkWrapWidth,
	});

	const {
		isNew,
		isMissing,
		isInitialResolving,
		blocks,
		hasAlreadyRendered,
		previewResizeListener,
		stablePreviewWidth,
		isShrinkWrapped,
		entityTitle,
		permalink,
		isBeingEdited,
		presenceMessage,
		effectiveRef,
		isForkActive,
		canEdit,
		invalidate,
	} = hookState;

	const controlsContext = {
		attributes,
		entityTitle,
		permalink,
		effectiveRef,
		isForkActive,
		blocks,
		canEdit,
		invalidate,
		...controlsProps,
	};

	const slotContext = {
		...hookState,
		attributes,
	};

	const blockProps = useBlockProps();

	if (hasAlreadyRendered) {
		return (
			<div {...blockProps}>
				<Warning>{labels.recursionWarning}</Warning>
			</div>
		);
	}

	if (isNew || isInitialResolving) {
		return (
			<div {...blockProps}>
				<Placeholder
					setAttributes={setAttributes}
					isNew={isNew}
					isResolving={isInitialResolving}
					{...placeholderProps}
				/>
			</div>
		);
	}

	if (isMissing) {
		return (
			<div {...blockProps}>
				<Controls {...controlsContext} />
				<Warning>{labels.deletedWarning}</Warning>
			</div>
		);
	}

	return (
		<RecursionProvider uniqueId={effectiveRef}>
			<div {...blockProps}>
				{isBeingEdited && presenceMessage && (
					<Notice
						status="info"
						isDismissible={false}
						className={presenceNoticeClassName}
					>
						{presenceMessage}
					</Notice>
				)}
				{renderNotices?.(slotContext)}
				<Controls {...controlsContext} />
				{renderBeforePreview?.(slotContext)}
				<SyncedEntityPreview
					blocks={blocks}
					labels={labels}
					isShrinkWrapped={isShrinkWrapped}
					stablePreviewWidth={stablePreviewWidth}
					previewResizeListener={previewResizeListener}
					isEmpty={isEmpty}
				/>
			</div>
		</RecursionProvider>
	);
}
