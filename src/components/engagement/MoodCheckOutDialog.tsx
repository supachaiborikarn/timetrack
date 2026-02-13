import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Smile, Meh, Frown, Loader2 } from "lucide-react";

interface MoodCheckOutDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mood: string, note: string) => Promise<void>;
    isLoading?: boolean;
}

export function MoodCheckOutDialog({ isOpen, onClose, onConfirm, isLoading }: MoodCheckOutDialogProps) {
    const [mood, setMood] = useState<string | null>(null);
    const [note, setNote] = useState("");

    const handleSubmit = () => {
        if (mood) {
            onConfirm(mood, note);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">วันนี้งานเป็นยังไงบ้างครับ?</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center gap-4 py-4">
                    <button
                        onClick={() => setMood("HAPPY")}
                        className={`flex flex-col items-center p-4 rounded-xl transition-all w-24 ${mood === "HAPPY" ? "bg-green-100 ring-2 ring-green-500 scale-105" : "hover:bg-slate-100"}`}
                    >
                        <Smile className={`w-12 h-12 mb-2 ${mood === "HAPPY" ? "text-green-600" : "text-slate-400"}`} />
                        <span className="text-xs font-medium text-slate-700">แฮปปี้</span>
                    </button>
                    <button
                        onClick={() => setMood("NEUTRAL")}
                        className={`flex flex-col items-center p-4 rounded-xl transition-all w-24 ${mood === "NEUTRAL" ? "bg-yellow-100 ring-2 ring-yellow-500 scale-105" : "hover:bg-slate-100"}`}
                    >
                        <Meh className={`w-12 h-12 mb-2 ${mood === "NEUTRAL" ? "text-yellow-600" : "text-slate-400"}`} />
                        <span className="text-xs font-medium text-slate-700">เฉยๆ</span>
                    </button>
                    <button
                        onClick={() => setMood("SAD")}
                        className={`flex flex-col items-center p-4 rounded-xl transition-all w-24 ${mood === "SAD" ? "bg-red-100 ring-2 ring-red-500 scale-105" : "hover:bg-slate-100"}`}
                    >
                        <Frown className={`w-12 h-12 mb-2 ${mood === "SAD" ? "text-red-600" : "text-slate-400"}`} />
                        <span className="text-xs font-medium text-slate-700">เหนื่อย/ท้อ</span>
                    </button>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="note" className="text-sm font-medium text-slate-600">มีอะไรอยากบอกหัวหน้าไหม? (ไม่บังคับ)</Label>
                    <Textarea
                        id="note"
                        placeholder="ระบายได้เต็มที่ครับ..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="resize-none h-24"
                    />
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center sm:gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto">
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!mood || isLoading}
                        className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        ยืนยันลงเวลาออก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
