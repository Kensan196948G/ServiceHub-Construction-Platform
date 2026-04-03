import { FileText } from "lucide-react";

export default function DailyReportsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">日報管理</h2>
      <div className="card text-center py-16 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3" />
        <p className="text-lg font-medium">日報機能は準備中です</p>
        <p className="text-sm mt-1">今後のリリースで実装予定</p>
      </div>
    </div>
  );
}
