import { AiTeacherPlayArea } from "../../features/ai-teacher-play-area/AiTeacherPlayArea";

export function AiTeacherPlayAreaApp({ showTitleBlock = true }: { showTitleBlock?: boolean }) {
  return <AiTeacherPlayArea showTitleBlock={showTitleBlock} />;
}
