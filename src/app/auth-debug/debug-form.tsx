'use client';

import { useState } from 'react';
import { debugLogin } from './actions';

export function DebugLoginForm() {
    const [result, setResult] = useState<any>(null);

    async function handleSubmit(formData: FormData) {
        setResult({ loading: true });
        const res = await debugLogin(formData);
        setResult(res);
    }

    return (
        <div className="space-y-4 border-t pt-4">
            <form action={handleSubmit} className="space-y-2">
                <div>
                    <label className="block text-xs">Provider</label>
                    <select name="provider" className="border p-1 w-full bg-slate-800 text-white">
                        <option value="password">Password (Admin/Manager)</option>
                        <option value="pin">PIN (Employee)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs">Username / Phone</label>
                    <input name="username" type="text" className="border p-1 w-full bg-slate-800 text-white" placeholder="admin or 08xxxxxx" />
                </div>
                <div>
                    <label className="block text-xs">Password / PIN</label>
                    <input name="password" type="text" className="border p-1 w-full bg-slate-800 text-white" placeholder="123456" />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm w-full font-bold hover:bg-blue-700">
                    Test Login
                </button>
            </form>

            {result && (
                <div className={`p-2 rounded text-xs ${result.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
