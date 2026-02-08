"use client";

import { useState } from "react";

export default function LineConnect() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateCode = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/line/link", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "コードの生成に失敗しました");
        return;
      }

      setCode(data.code);
    } catch {
      setError("コードの生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">LINE連携</h2>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        LINE公式アカウントと連携すると、服薬リマインドの通知を受け取ったり、
        LINEから服薬記録ができるようになります。
      </p>

      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">連携手順</h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
            <li>下の「連携コードを発行」ボタンを押す</li>
            <li>表示された6桁のコードをコピー</li>
            <li>LINE公式アカウントにそのコードを送信</li>
            <li>連携完了のメッセージが届きます</li>
          </ol>
        </div>

        {error && (
          <div className="p-3 bg-danger/10 text-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        {code ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              連携コード（10分間有効）
            </p>
            <div className="text-4xl font-mono font-bold tracking-[0.3em] text-primary">
              {code}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              このコードをLINE公式アカウントに送信してください
            </p>
            <button
              onClick={generateCode}
              className="mt-4 text-sm text-primary hover:text-primary-dark font-medium"
            >
              コードを再発行
            </button>
          </div>
        ) : (
          <button
            onClick={generateCode}
            disabled={loading}
            className="w-full py-3 bg-[#06C755] hover:bg-[#05B34C] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "生成中..." : "連携コードを発行"}
          </button>
        )}
      </div>
    </div>
  );
}
