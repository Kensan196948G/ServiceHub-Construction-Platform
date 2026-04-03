import { HardHat } from "lucide-react";

export default function SafetyPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">安全品質管理</h2>
      <div className="card text-center py-16 text-gray-400">
        <HardHat className="w-12 h-12 mx-auto mb-3" />
        <p className="text-lg font-medium">安全品質機能は準備中です</p>
        <p className="text-sm mt-1">今後のリリースで実装予定</p>
      </div>
    </div>
  );
}
