/* eslint-disable jsdoc/require-param -- Props documented via exported interfaces */
/**
 * WordPress Dependencies
 */
import type { CSSProperties, KeyboardEvent } from 'react';
import { memo, useMemo, useState, useEffect } from 'react';
import { useSelect } from '@wordpress/data';
import {
	BlockContextProvider,
	__experimentalUseBlockPreview as useBlockPreview,
	useInnerBlocksProps,
	store as blockEditorStore,
	Warning,
} from '@wordpress/block-editor';
import { Spinner, Flex, FlexBlock, FlexItem } from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';

export type BlockContextValue = Record<string, unknown>;

/**
 * Stable React keys and active-context ids for block preview switching.
 * Prefers postType + postId when present; otherwise JSON.stringify (custom shapes).
 *
 * @param blockContext Block context from REST or custom block data.
 */
function getStableBlockContextId(blockContext: BlockContextValue): string {
	const postId = blockContext.postId;
	const postType = blockContext.postType;
	if (
		postId !== undefined &&
		postId !== null &&
		typeof postType === 'string' &&
		postType.length > 0
	) {
		return `${postType}:${String(postId)}`;
	}
	return JSON.stringify(blockContext);
}

function InnerBlocksTemplateBlocks({
	allowedBlocks = [
		'core/post-title',
		'core/post-date',
		'core/post-excerpt',
		'core/group',
		'core/paragraph',
	],
	template,
	wrapperProps = {},
}: {
	allowedBlocks?: string[];
	template?: unknown;
	wrapperProps?: Record<string, unknown>;
}) {
	const innerBlocksProps = useInnerBlocksProps(wrapperProps, {
		allowedBlocks,
		template,
	});
	return <div {...innerBlocksProps} />;
}

function InnerBlocksAsContextTemplatePreview({
	blocks,
	blockContextId,
	isHidden,
	setActiveBlockContextId,
}: {
	blocks: unknown[];
	blockContextId: string;
	isHidden: boolean;
	setActiveBlockContextId: (id: string) => void;
}) {
	const blockPreviewProps = useBlockPreview({
		// getBlocks returns parsed blocks; experimental preview hook lacks precise typings.
		blocks: blocks as never,
	});

	const handleActivate = () => {
		setActiveBlockContextId(blockContextId);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setActiveBlockContextId(blockContextId);
		}
	};

	const style: CSSProperties = {
		display: isHidden ? 'none' : undefined,
	};

	return (
		<div
			{...blockPreviewProps}
			tabIndex={0}
			role="button"
			onClick={handleActivate}
			onKeyDown={handleKeyDown}
			style={style}
		/>
	);
}

const MemoizedInnerBlocksTemplatePreview = memo(
	InnerBlocksAsContextTemplatePreview
);

export function useInnerBlocksContextAsQuery(
	postType: string,
	perPage = 10
): { blockContexts: BlockContextValue[]; isResolving: boolean } {
	const { records, isResolving } = useEntityRecords('postType', postType, {
		per_page: perPage,
		post_parent: 0, // exclude child posts
		context: 'view',
	});

	const blockContexts = useMemo(() => {
		if (!records || isResolving) {
			return [];
		}
		return records.map(
			(post: { id: number; type: string; props?: unknown }) => {
				return {
					queryId: 0,
					postId: post.id,
					postType: post.type,
					props: post.props,
				};
			}
		);
	}, [records, isResolving]);

	return { blockContexts, isResolving };
}

export interface InnerBlocksAsContextTemplateProps {
	clientId: string;
	allowedBlocks?: string[];
	template?: unknown;
	blockContexts: BlockContextValue[];
	isResolving?: boolean;
	loadingLabel?: string;
	wrapperProps?: Record<string, unknown>;
}

export function InnerBlocksAsContextTemplate({
	clientId,
	allowedBlocks,
	template,
	blockContexts,
	isResolving = true,
	loadingLabel = 'Loading...',
	wrapperProps = {},
}: InnerBlocksAsContextTemplateProps) {
	const [activeBlockContextId, setActiveBlockContextId] = useState<
		string | null
	>(null);

	const { blocks } = useSelect(
		(select) => {
			const { getBlocks } = select(blockEditorStore);
			return {
				blocks: getBlocks(clientId),
			};
		},
		[clientId]
	);

	useEffect(() => {
		if (blockContexts.length > 0) {
			const firstBlockContext = blockContexts[0];
			setActiveBlockContextId(getStableBlockContextId(firstBlockContext));
		}
	}, [blockContexts]);

	if (isResolving) {
		return (
			<Warning>
				<Flex align="center" gap="10px">
					<FlexBlock>{`${loadingLabel}`}</FlexBlock>
					<FlexItem>
						<Spinner />
					</FlexItem>
				</Flex>
			</Warning>
		);
	}

	return (
		<div {...wrapperProps}>
			{blockContexts &&
				blockContexts.map((blockContext) => {
					const contextId = getStableBlockContextId(blockContext);
					const isVisible =
						contextId ===
						(activeBlockContextId ||
							getStableBlockContextId(blockContexts[0]));

					return (
						<BlockContextProvider
							key={contextId}
							value={blockContext}
						>
							{isVisible ? (
								<InnerBlocksTemplateBlocks
									{...{
										allowedBlocks,
										template,
									}}
								/>
							) : null}
							<MemoizedInnerBlocksTemplatePreview
								blocks={blocks}
								blockContextId={contextId}
								setActiveBlockContextId={
									setActiveBlockContextId
								}
								isHidden={isVisible}
							/>
						</BlockContextProvider>
					);
				})}
		</div>
	);
}
