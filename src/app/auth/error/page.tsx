"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-4xl font-bold mb-4 text-red-600">Authentication Error</h1>
            <p className="text-xl mb-4">
                There was an error verifying your identity.
            </p>
            <div className="p-4 bg-gray-100 rounded border border-gray-300">
                <code className="text-red-500 font-mono text-lg">{error}</code>
            </div>
            <p className="mt-4 text-gray-500">
                Please contact administrator or try again.
            </p>
            <a href="/login" className="mt-8 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Back to Login
            </a>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div>Loading error details...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
