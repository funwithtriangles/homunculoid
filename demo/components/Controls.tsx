import c from "./controls.module.css";
import { PiFaders } from "react-icons/pi";

import { ControlGrid, EngineNodeContainer } from "@hedron-gl/ui-core";

const nodeIds: string[] = [
  "5fab78da42bee88f", // playheadPositionMs
];

interface ControlsProps {
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
}

function Controls({ isOpen, onToggle }: ControlsProps) {
  return (
    <div className={c.controls}>
      <button
        className={c.toggleButton}
        onClick={onToggle}
        aria-label="Toggle controls"
      >
        <PiFaders />
      </button>

      {isOpen && (
        <div className={c.panel} onClick={(e) => e.stopPropagation()}>
          <ControlGrid>
            {nodeIds.map((id) => (
              <EngineNodeContainer key={id} nodeId={id} />
            ))}
          </ControlGrid>
        </div>
      )}
    </div>
  );
}

export default Controls;
