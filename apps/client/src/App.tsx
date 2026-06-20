import { PhaserGame } from "./game/PhaserGame";
import { GameOverlay } from "./ui/GameOverlay";

export function App() {
  return (
    <div className="app-root">
      <PhaserGame />
      <GameOverlay />
    </div>
  );
}
