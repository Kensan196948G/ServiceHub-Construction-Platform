import { BookOpen } from "lucide-react";

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">AIナレッジベース</h2>
      <div className="card text-center py-16 text-gray-400">
        <BookOpen className="w-12 h-12 mx-auto mb-3" />
        <p className="text-lg font-medium">ナレッジ機能は準備中です</p>
        <p className="text-sm mt-1">今後のリリースで実装予定</p>
      </div>
    </div>
  );
}
