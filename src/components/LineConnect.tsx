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
        <a
          href="https://lin.ee/sywTQBY"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-[#06C755] hover:bg-[#05B34C] text-white rounded-lg font-medium transition-colors"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63h-1.755v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63h-1.755v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          公式LINEを友だち追加
        </a>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">連携手順</h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
            <li>上のボタンから公式LINEを友だち追加</li>
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
