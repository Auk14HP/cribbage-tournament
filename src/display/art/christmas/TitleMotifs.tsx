import type { MovingProps } from '../artwork';
import { Present } from './Present';
import { Tree } from './Tree';

// Christmas's motifs beside a title: the tree and the present side by side, on the box's floor.
export const TitleMotifs = ({ isMoving }: MovingProps) => (
	<span className="flex h-full items-end gap-[0.4cqh]">
		<Tree isMoving={isMoving} />
		<Present />
	</span>
);
