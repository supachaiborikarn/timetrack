"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { isValidThaiCitizenId } from "@/lib/thai-citizen-id";
import { PhotoCaptureField, type CapturedPhoto } from "@/components/applications/photo-capture-field";
import { DocumentUploadField, type AttachedDocument } from "@/components/applications/document-upload-field";

type StationOption = {
    id: string;
    name: string;
    departments: { id: string; name: string }[];
};

type JobOpeningRef = {
    id: string;
    slug: string;
    title: string;
    employmentType: string | null;
    stationId: string | null;
    departmentId: string | null;
};

interface ApplyFormProps {
    stations: StationOption[];
    companyName: string;
    formToken: string;
    /** The posting being applied to — position and branch come from it. Applications
     * always start from a posting, so this is never absent. */
    opening: JobOpeningRef;
}

type Education = { level: string; institute: string; major: string; graduationYear: string; gpa: string };
type WorkExperience = { company: string; position: string; fromYear: string; toYear: string; salary: string; leaveReason: string };

interface FormState {
    positionTitle: string;
    employmentType: string;
    stationId: string;
    departmentId: string;
    expectedSalary: string;
    availableFrom: string;
    preferredShifts: string[];

    prefix: string;
    firstName: string;
    lastName: string;
    nickName: string;
    birthDate: string;
    gender: string;
    nationality: string;
    religion: string;
    maritalStatus: string;
    militaryStatus: string;
    citizenId: string;
    phone: string;
    lineId: string;
    email: string;
    addressRegistered: string;
    addressCurrent: string;
    sameAsRegistered: boolean;
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelation: string;

    educations: Education[];
    workExperiences: WorkExperience[];
    hasDrivingLicense: boolean;
    licenseTypes: string;
    screeningWorkedAtGasStation: string;
    screeningCanWorkNightShift: string;
    screeningHasHealthCondition: string;
    screeningHealthDetail: string;
    applicantNote: string;

    profilePhoto: CapturedPhoto | null;
    citizenIdPhoto: CapturedPhoto | null;
    educationCert: AttachedDocument | null;
    resume: AttachedDocument | null;

    consentAccepted: boolean;
    website: string; // honeypot
}

const STORAGE_KEY = "timetrack:job-application-draft:v1";
const STEP_COUNT = 5;

function emptyFormState(): FormState {
    return {
        positionTitle: "",
        employmentType: "",
        stationId: "",
        departmentId: "",
        expectedSalary: "",
        availableFrom: "",
        preferredShifts: [],

        prefix: "",
        firstName: "",
        lastName: "",
        nickName: "",
        birthDate: "",
        gender: "",
        nationality: "",
        religion: "",
        maritalStatus: "",
        militaryStatus: "",
        citizenId: "",
        phone: "",
        lineId: "",
        email: "",
        addressRegistered: "",
        addressCurrent: "",
        sameAsRegistered: false,
        emergencyName: "",
        emergencyPhone: "",
        emergencyRelation: "",

        educations: [],
        workExperiences: [],
        hasDrivingLicense: false,
        licenseTypes: "",
        screeningWorkedAtGasStation: "",
        screeningCanWorkNightShift: "",
        screeningHasHealthCondition: "",
        screeningHealthDetail: "",
        applicantNote: "",

        profilePhoto: null,
        citizenIdPhoto: null,
        educationCert: null,
        resume: null,

        consentAccepted: false,
        website: "",
    };
}

function loadDraft(): FormState {
    if (typeof window === "undefined") return emptyFormState();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyFormState();
        return { ...emptyFormState(), ...JSON.parse(raw) };
    } catch {
        return emptyFormState();
    }
}

function calcAge(birthDate: string): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const ageMs = Date.now() - birth.getTime();
    const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 0 && age < 130 ? age : null;
}

const SHIFT_OPTIONS = [
    { value: "MORNING", key: "apply.shiftMorning" },
    { value: "AFTERNOON", key: "apply.shiftAfternoon" },
    { value: "NIGHT", key: "apply.shiftNight" },
];

export function ApplyForm({ stations, companyName, formToken, opening }: ApplyFormProps) {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormState>(emptyFormState);
    const [hydrated, setHydrated] = useState(false);
    const [stepError, setStepError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [result, setResult] = useState<{ refCode: string; duplicate: boolean; reason?: string } | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Deferred to a microtask: restoring localStorage after mount must happen once
        // the client is up, but this keeps the server-rendered empty state as the first
        // paint (no hydration mismatch) instead of setting state synchronously in the effect.
        Promise.resolve().then(() => {
            const draft = loadDraft();
            // The posting is the source of truth for what they're applying to — it overrides
            // any stale position/branch left in a draft from a previous visit.
            setForm({
                ...draft,
                positionTitle: opening.title,
                employmentType: opening.employmentType ?? draft.employmentType,
                stationId: opening.stationId ?? draft.stationId,
                departmentId: opening.departmentId ?? draft.departmentId,
            });
            setHydrated(true);
        });
    }, [opening]);

    useEffect(() => {
        if (!hydrated) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
        }, 400);
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, [form, hydrated]);

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    const selectedStation = stations.find((s) => s.id === form.stationId);
    const age = useMemo(() => calcAge(form.birthDate), [form.birthDate]);

    const watermarkText = useMemo(() => {
        const date = new Date().toLocaleDateString("th-TH-u-ca-buddhist", { year: "numeric", month: "2-digit", day: "2-digit" });
        return `${t("apply.watermarkPrefix")} ${companyName} ${date}`;
    }, [companyName, t]);

    function validateCurrentStep(): string | null {
        if (step === 1) {
            if (!form.positionTitle.trim()) return t("apply.errPosition");
            if (!form.stationId) return t("apply.errStation");
        }
        if (step === 2) {
            if (!form.firstName.trim() || !form.lastName.trim()) return t("apply.errName");
            if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 9) return t("apply.errPhone");
            if (!form.birthDate) return t("apply.errBirthDate");
            if (age !== null && (age < 15 || age > 75)) return t("apply.errBirthDate");
            if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t("apply.errEmail");
            const citizenDigits = form.citizenId.replace(/\D/g, "");
            if (!citizenDigits || citizenDigits.length !== 13) return t("apply.errCitizenId");
            // Same checksum rule the server enforces — checked here too so a typo is caught on
            // this step instead of after the applicant has filled in everything and uploaded photos.
            if (!isValidThaiCitizenId(citizenDigits)) return t("apply.errCitizenIdChecksum");
        }
        if (step === 4) {
            if (!form.profilePhoto) return t("apply.errProfilePhoto");
            if (!form.citizenIdPhoto) return t("apply.errCitizenIdPhoto");
        }
        if (step === 5) {
            if (!form.consentAccepted) return t("apply.errConsent");
        }
        return null;
    }

    function goNext() {
        const error = validateCurrentStep();
        if (error) {
            setStepError(error);
            return;
        }
        setStepError(null);
        setStep((s) => Math.min(STEP_COUNT, s + 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function goBack() {
        setStepError(null);
        setStep((s) => Math.max(1, s - 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleSubmit() {
        const error = validateCurrentStep();
        if (error) {
            setStepError(error);
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        const fileIds = [form.profilePhoto?.fileId, form.citizenIdPhoto?.fileId, form.educationCert?.fileId, form.resume?.fileId].filter(
            (id): id is string => Boolean(id)
        );
        // Drop rows the user added but never filled in — otherwise "+ Add Row" followed by
        // second thoughts silently saves an empty record.
        const educations = form.educations.filter((e) => Object.values(e).some((v) => v.trim()));
        const workExperiences = form.workExperiences.filter((w) => Object.values(w).some((v) => v.trim()));

        const payload = {
            formToken,
            website: form.website,
            positionTitle: form.positionTitle.trim(),
            employmentType: form.employmentType || undefined,
            stationId: form.stationId,
            departmentId: form.departmentId || undefined,
            expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : undefined,
            availableFrom: form.availableFrom || undefined,
            preferredShifts: form.preferredShifts,
            prefix: form.prefix || undefined,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            nickName: form.nickName || undefined,
            birthDate: form.birthDate,
            gender: form.gender || undefined,
            nationality: form.nationality || undefined,
            religion: form.religion || undefined,
            maritalStatus: form.maritalStatus || undefined,
            militaryStatus: form.militaryStatus || undefined,
            citizenId: form.citizenId.replace(/\D/g, ""),
            phone: form.phone.trim(),
            lineId: form.lineId || undefined,
            email: form.email || undefined,
            addressRegistered: form.addressRegistered || undefined,
            addressCurrent: (form.sameAsRegistered ? form.addressRegistered : form.addressCurrent) || undefined,
            emergencyName: form.emergencyName || undefined,
            emergencyPhone: form.emergencyPhone || undefined,
            emergencyRelation: form.emergencyRelation || undefined,
            educations,
            workExperiences,
            hasDrivingLicense: form.hasDrivingLicense,
            licenseTypes: form.licenseTypes || undefined,
            screeningAnswers: {
                workedAtGasStationBefore: form.screeningWorkedAtGasStation === "yes",
                canWorkNightShift: form.screeningCanWorkNightShift === "yes",
                hasHealthCondition: form.screeningHasHealthCondition === "yes",
                healthConditionDetail: form.screeningHealthDetail || undefined,
            },
            applicantNote: form.applicantNote || undefined,
            source: "JOB_POSTING",
            jobOpeningId: opening.id,
            fileIds,
            consentAccepted: form.consentAccepted,
        };

        try {
            const res = await fetch("/api/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (res.status === 409 && json.refCode) {
                setResult({ refCode: json.refCode, duplicate: true, reason: json.error });
                window.localStorage.removeItem(STORAGE_KEY);
                return;
            }
            if (!res.ok) {
                setSubmitError(json.error || t("apply.errSubmit"));
                setSubmitting(false);
                return;
            }

            setResult({ refCode: json.refCode, duplicate: false });
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            setSubmitError(t("apply.errSubmit"));
            setSubmitting(false);
        }
    }

    if (result) {
        return (
            <div className="min-h-dvh flex items-center justify-center p-4 bg-muted/30">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center space-y-4">
                        {result.duplicate
                            ? <AlertCircle className="size-14 text-amber-600 mx-auto" />
                            : <CheckCircle2 className="size-14 text-green-600 mx-auto" />}
                        <h1 className="text-lg font-bold">{result.duplicate ? t("apply.duplicateTitle") : t("apply.successTitle")}</h1>
                        {/* The server explains exactly why this counted as a duplicate (still under
                            review / already hired / too soon after a rejection), which is more useful
                            than the generic line — fall back to it only if the reason is missing. */}
                        <p className="text-sm text-muted-foreground">
                            {result.duplicate ? (result.reason || t("apply.duplicateDesc")) : t("apply.successDesc")}
                        </p>
                        <div className="rounded-lg border-2 border-dashed p-4">
                            <p className="text-xs text-muted-foreground mb-1">{t("apply.refCodeLabel")}</p>
                            <p className="text-2xl font-mono font-bold tracking-wider">{result.refCode}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{t("apply.saveScreenshotHint")}</p>
                        <a href="/apply/status" className="block">
                            <Button type="button" variant="outline" className="w-full">{t("apply.checkStatusLink")}</Button>
                        </a>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50">
            <div className="max-w-lg mx-auto p-4 space-y-4">
                <header className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-5 shadow-[0_3px_0_rgba(0,0,0,0.06)] text-zinc-950 dark:text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">JOB APPLICATION</p>
                    <h1 className="text-xl font-black text-zinc-950 dark:text-white mt-0.5">{t("apply.pageTitle")}</h1>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{companyName}</p>
                </header>

                <div className="flex items-center gap-1.5 px-1" aria-label={t("apply.progressLabel")}>
                    {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((s) => (
                        <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-[#fbbf24] shadow-sm" : "bg-zinc-700/20 dark:bg-white/10"}`} />
                    ))}
                </div>

                <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-5 shadow-[0_2px_0_rgba(0,0,0,0.06)] space-y-4">
                        <input
                            type="text"
                            name="website"
                            value={form.website}
                            onChange={(e) => update("website", e.target.value)}
                            className="hidden"
                            tabIndex={-1}
                            autoComplete="off"
                        />

                        <h2 className="font-semibold text-base">
                            {t("apply.stepPrefix")} {step}/{STEP_COUNT} — {t(`apply.step${step}Title`)}
                        </h2>

                        {step === 1 && (
                            <div className="space-y-4">
                                {/* The position comes from the posting, so it's shown as confirmation
                                    rather than an editable field the applicant could contradict. */}
                                <div className="rounded-lg border bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground">{t("apply.applyingFor")}</p>
                                    <p className="font-medium">{opening.title}</p>
                                    <a href={`/jobs/${encodeURIComponent(opening.slug)}`} className="text-xs text-primary underline">
                                        {t("apply.viewJobDetails")}
                                    </a>
                                </div>
                                <Field label={t("apply.employmentType")}>
                                    <Select value={form.employmentType} onValueChange={(v) => update("employmentType", v)} disabled={Boolean(opening.employmentType)}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder={t("apply.selectPlaceholder")} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FULL_TIME">{t("apply.employmentFullTime")}</SelectItem>
                                            <SelectItem value="PART_TIME">{t("apply.employmentPartTime")}</SelectItem>
                                            <SelectItem value="DAILY">{t("apply.employmentDaily")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={t("apply.station")} required>
                                        <Select
                                            value={form.stationId}
                                            onValueChange={(v) => setForm((p) => ({ ...p, stationId: v, departmentId: "" }))}
                                            disabled={Boolean(opening.stationId)}
                                        >
                                            <SelectTrigger className="w-full"><SelectValue placeholder={t("apply.selectPlaceholder")} /></SelectTrigger>
                                            <SelectContent>
                                                {stations.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label={t("apply.department")}>
                                        <Select value={form.departmentId} onValueChange={(v) => update("departmentId", v)} disabled={!selectedStation?.departments.length}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder={t("apply.selectPlaceholder")} /></SelectTrigger>
                                            <SelectContent>
                                                {selectedStation?.departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={t("apply.expectedSalary")}>
                                        <Input type="number" inputMode="numeric" min={0} value={form.expectedSalary} onChange={(e) => update("expectedSalary", e.target.value)} />
                                    </Field>
                                    <Field label={t("apply.availableFrom")}>
                                        <Input type="date" value={form.availableFrom} onChange={(e) => update("availableFrom", e.target.value)} />
                                    </Field>
                                </div>
                                <Field label={t("apply.preferredShifts")}>
                                    <div className="flex flex-wrap gap-3">
                                        {SHIFT_OPTIONS.map((opt) => (
                                            <label key={opt.value} className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={form.preferredShifts.includes(opt.value)}
                                                    onCheckedChange={(checked) =>
                                                        update("preferredShifts", checked
                                                            ? [...form.preferredShifts, opt.value]
                                                            : form.preferredShifts.filter((v) => v !== opt.value))
                                                    }
                                                />
                                                {t(opt.key)}
                                            </label>
                                        ))}
                                    </div>
                                </Field>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label={t("apply.prefix")}>
                                        <Select value={form.prefix} onValueChange={(v) => update("prefix", v)}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="-" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="นาย">{t("apply.prefixMr")}</SelectItem>
                                                <SelectItem value="นาง">{t("apply.prefixMrs")}</SelectItem>
                                                <SelectItem value="นางสาว">{t("apply.prefixMs")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label={t("apply.firstName")} required className="col-span-1">
                                        <Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
                                    </Field>
                                    <Field label={t("apply.lastName")} required>
                                        <Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
                                    </Field>
                                </div>
                                <Field label={t("apply.nickName")}>
                                    <Input value={form.nickName} onChange={(e) => update("nickName", e.target.value)} />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={t("apply.birthDate")} required hint={age !== null ? `${t("apply.ageLabel")} ${age} ${t("apply.yearsOld")}` : undefined}>
                                        <Input type="date" value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} />
                                    </Field>
                                    <Field label={t("apply.gender")}>
                                        <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder={t("apply.selectPlaceholder")} /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MALE">{t("apply.genderMale")}</SelectItem>
                                                <SelectItem value="FEMALE">{t("apply.genderFemale")}</SelectItem>
                                                <SelectItem value="OTHER">{t("apply.genderOther")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={t("apply.nationality")}>
                                        <Input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
                                    </Field>
                                    <Field label={t("apply.religion")}>
                                        <Input value={form.religion} onChange={(e) => update("religion", e.target.value)} />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={t("apply.maritalStatus")}>
                                        <Select value={form.maritalStatus} onValueChange={(v) => update("maritalStatus", v)}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder={t("apply.selectPlaceholder")} /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SINGLE">{t("apply.maritalSingle")}</SelectItem>
                                                <SelectItem value="MARRIED">{t("apply.maritalMarried")}</SelectItem>
                                                <SelectItem value="DIVORCED">{t("apply.maritalDivorced")}</SelectItem>
                                                <SelectItem value="WIDOWED">{t("apply.maritalWidowed")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label={t("apply.militaryStatus")}>
                                        <Select value={form.militaryStatus} onValueChange={(v) => update("militaryStatus", v)}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder={t("apply.selectPlaceholder")} /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DONE">{t("apply.militaryDone")}</SelectItem>
                                                <SelectItem value="EXEMPTED">{t("apply.militaryExempted")}</SelectItem>
                                                <SelectItem value="NOT_YET">{t("apply.militaryNotYet")}</SelectItem>
                                                <SelectItem value="NA">{t("apply.militaryNa")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                                <Field label={t("apply.citizenId")} required hint={t("apply.citizenIdHint")}>
                                    <Input
                                        inputMode="numeric"
                                        maxLength={13}
                                        value={form.citizenId}
                                        onChange={(e) => update("citizenId", e.target.value.replace(/\D/g, "").slice(0, 13))}
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label={t("apply.phone")} required>
                                        <Input inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                                    </Field>
                                    <Field label={t("apply.lineId")}>
                                        <Input value={form.lineId} onChange={(e) => update("lineId", e.target.value)} />
                                    </Field>
                                </div>
                                <Field label={t("apply.email")}>
                                    <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
                                </Field>
                                <Field label={t("apply.addressRegistered")}>
                                    <Textarea rows={2} value={form.addressRegistered} onChange={(e) => update("addressRegistered", e.target.value)} />
                                </Field>
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox checked={form.sameAsRegistered} onCheckedChange={(c) => update("sameAsRegistered", Boolean(c))} />
                                    {t("apply.sameAsRegistered")}
                                </label>
                                {!form.sameAsRegistered && (
                                    <Field label={t("apply.addressCurrent")}>
                                        <Textarea rows={2} value={form.addressCurrent} onChange={(e) => update("addressCurrent", e.target.value)} />
                                    </Field>
                                )}
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label={t("apply.emergencyName")}>
                                        <Input value={form.emergencyName} onChange={(e) => update("emergencyName", e.target.value)} />
                                    </Field>
                                    <Field label={t("apply.emergencyPhone")}>
                                        <Input inputMode="tel" value={form.emergencyPhone} onChange={(e) => update("emergencyPhone", e.target.value)} />
                                    </Field>
                                    <Field label={t("apply.emergencyRelation")}>
                                        <Input value={form.emergencyRelation} onChange={(e) => update("emergencyRelation", e.target.value)} />
                                    </Field>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-5">
                                <RepeatingSection
                                    title={t("apply.educationsTitle")}
                                    addLabel={t("apply.addRow")}
                                    items={form.educations}
                                    onAdd={() => update("educations", [...form.educations, { level: "", institute: "", major: "", graduationYear: "", gpa: "" }])}
                                    onRemove={(i) => update("educations", form.educations.filter((_, idx) => idx !== i))}
                                    renderItem={(item, i) => (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input placeholder={t("apply.eduLevel")} value={item.level} onChange={(e) => update("educations", form.educations.map((x, idx) => (idx === i ? { ...x, level: e.target.value } : x)))} />
                                            <Input placeholder={t("apply.eduInstitute")} value={item.institute} onChange={(e) => update("educations", form.educations.map((x, idx) => (idx === i ? { ...x, institute: e.target.value } : x)))} />
                                            <Input placeholder={t("apply.eduMajor")} value={item.major} onChange={(e) => update("educations", form.educations.map((x, idx) => (idx === i ? { ...x, major: e.target.value } : x)))} />
                                            <Input placeholder={t("apply.eduYear")} value={item.graduationYear} onChange={(e) => update("educations", form.educations.map((x, idx) => (idx === i ? { ...x, graduationYear: e.target.value } : x)))} />
                                        </div>
                                    )}
                                />

                                <RepeatingSection
                                    title={t("apply.workExpTitle")}
                                    addLabel={t("apply.addRow")}
                                    items={form.workExperiences}
                                    onAdd={() => update("workExperiences", [...form.workExperiences, { company: "", position: "", fromYear: "", toYear: "", salary: "", leaveReason: "" }])}
                                    onRemove={(i) => update("workExperiences", form.workExperiences.filter((_, idx) => idx !== i))}
                                    renderItem={(item, i) => (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input placeholder={t("apply.workCompany")} value={item.company} onChange={(e) => update("workExperiences", form.workExperiences.map((x, idx) => (idx === i ? { ...x, company: e.target.value } : x)))} />
                                            <Input placeholder={t("apply.workPosition")} value={item.position} onChange={(e) => update("workExperiences", form.workExperiences.map((x, idx) => (idx === i ? { ...x, position: e.target.value } : x)))} />
                                            <Input placeholder={t("apply.workFromYear")} value={item.fromYear} onChange={(e) => update("workExperiences", form.workExperiences.map((x, idx) => (idx === i ? { ...x, fromYear: e.target.value } : x)))} />
                                            <Input placeholder={t("apply.workToYear")} value={item.toYear} onChange={(e) => update("workExperiences", form.workExperiences.map((x, idx) => (idx === i ? { ...x, toYear: e.target.value } : x)))} />
                                            <Input className="col-span-2" placeholder={t("apply.workLeaveReason")} value={item.leaveReason} onChange={(e) => update("workExperiences", form.workExperiences.map((x, idx) => (idx === i ? { ...x, leaveReason: e.target.value } : x)))} />
                                        </div>
                                    )}
                                />

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm">
                                        <Checkbox checked={form.hasDrivingLicense} onCheckedChange={(c) => update("hasDrivingLicense", Boolean(c))} />
                                        {t("apply.hasDrivingLicense")}
                                    </label>
                                    {form.hasDrivingLicense && (
                                        <Input placeholder={t("apply.licenseTypes")} value={form.licenseTypes} onChange={(e) => update("licenseTypes", e.target.value)} />
                                    )}
                                </div>

                                <div className="space-y-3 rounded-lg border p-3">
                                    <p className="text-sm font-medium">{t("apply.screeningTitle")}</p>
                                    <YesNoField label={t("apply.screeningWorkedAtGasStation")} value={form.screeningWorkedAtGasStation} onChange={(v) => update("screeningWorkedAtGasStation", v)} t={t} />
                                    <YesNoField label={t("apply.screeningCanWorkNightShift")} value={form.screeningCanWorkNightShift} onChange={(v) => update("screeningCanWorkNightShift", v)} t={t} />
                                    <YesNoField label={t("apply.screeningHasHealthCondition")} value={form.screeningHasHealthCondition} onChange={(v) => update("screeningHasHealthCondition", v)} t={t} />
                                    {form.screeningHasHealthCondition === "yes" && (
                                        <Textarea rows={2} placeholder={t("apply.screeningHealthDetail")} value={form.screeningHealthDetail} onChange={(e) => update("screeningHealthDetail", e.target.value)} />
                                    )}
                                </div>

                                <Field label={t("apply.applicantNote")}>
                                    <Textarea rows={3} value={form.applicantNote} onChange={(e) => update("applicantNote", e.target.value)} />
                                </Field>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-5">
                                <PhotoCaptureField kind="PROFILE_PHOTO" label={`${t("apply.profilePhoto")} *`} value={form.profilePhoto} onChange={(v) => update("profilePhoto", v)} />
                                <PhotoCaptureField kind="CITIZEN_ID" label={`${t("apply.citizenIdPhoto")} *`} value={form.citizenIdPhoto} onChange={(v) => update("citizenIdPhoto", v)} watermarkText={watermarkText} />
                                <DocumentUploadField kind="EDUCATION_CERT" label={t("apply.educationCertFile")} value={form.educationCert} onChange={(v) => update("educationCert", v)} />
                                <DocumentUploadField kind="RESUME" label={t("apply.resumeFile")} value={form.resume} onChange={(v) => update("resume", v)} />
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-4">
                                <div className="rounded-lg border divide-y text-sm">
                                    <ReviewRow label={t("apply.positionTitle")} value={form.positionTitle} />
                                    <ReviewRow label={t("apply.station")} value={selectedStation?.name} />
                                    <ReviewRow label={t("apply.firstName") + " " + t("apply.lastName")} value={`${form.prefix} ${form.firstName} ${form.lastName}`.trim()} />
                                    <ReviewRow label={t("apply.phone")} value={form.phone} />
                                    <ReviewRow label={t("apply.citizenId")} value={form.citizenId ? `${form.citizenId.slice(0, 1)}-xxxx-xxxxx-xx-${form.citizenId.slice(-1)}` : ""} />
                                    <ReviewRow label={t("apply.birthDate")} value={form.birthDate ? `${form.birthDate} (${age} ${t("apply.yearsOld")})` : ""} />
                                </div>

                                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                                    <p className="font-medium text-foreground">{t("apply.consentTitle")}</p>
                                    <p>{t("apply.consentPurpose").replace("{company}", companyName)}</p>
                                    <p>{t("apply.consentDataCollected")}</p>
                                    <p>{t("apply.consentForeignServer")}</p>
                                    <p>{t("apply.consentRetention")}</p>
                                    <p>{t("apply.consentRights")}</p>
                                </div>
                                <label className="flex items-start gap-2 text-sm">
                                    <Checkbox checked={form.consentAccepted} onCheckedChange={(c) => update("consentAccepted", Boolean(c))} className="mt-0.5" />
                                    <span>{t("apply.consentCheckboxLabel")}</span>
                                </label>
                            </div>
                        )}

                        {stepError && <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/25">{stepError}</p>}
                        {submitError && <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/25">{submitError}</p>}
                    </div>
            </div>

            <div className="fixed bottom-0 inset-x-0 bg-[#eee8db]/90 dark:bg-zinc-950/90 backdrop-blur border-t border-zinc-700/20 dark:border-white/10 p-3 z-30">
                <div className="max-w-lg mx-auto flex gap-2">
                    {step > 1 && (
                        <Button type="button" variant="outline" onClick={goBack} disabled={submitting} className="tt-retro-control rounded-xl border border-zinc-700/30 bg-white/60 dark:bg-zinc-800 font-bold h-11">
                            <ChevronLeft className="size-4" />
                            {t("apply.back")}
                        </Button>
                    )}
                    {step < STEP_COUNT ? (
                        <Button type="button" className="flex-1 tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/20 h-11 text-sm shadow-sm" onClick={goNext}>
                            {t("apply.next")}
                            <ChevronRight className="size-4" />
                        </Button>
                    ) : (
                        <Button type="button" className="flex-1 tt-retro-control bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-11 text-sm shadow-sm" onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="size-4 animate-spin" />}
                            {t("apply.submit")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, required, hint, className, children }: { label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }) {
    return (
        <div className={`space-y-1.5 ${className ?? ""}`}>
            <Label>
                {label}
                {required && <span className="text-destructive"> *</span>}
            </Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex justify-between gap-3 p-2.5">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value || "-"}</span>
        </div>
    );
}

function YesNoField({ label, value, onChange, t }: { label: string; value: string; onChange: (v: string) => void; t: (key: string) => string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{label}</span>
            <div className="flex gap-1">
                <Button type="button" size="sm" variant={value === "yes" ? "default" : "outline"} onClick={() => onChange("yes")}>{t("apply.yes")}</Button>
                <Button type="button" size="sm" variant={value === "no" ? "default" : "outline"} onClick={() => onChange("no")}>{t("apply.no")}</Button>
            </div>
        </div>
    );
}

function RepeatingSection<T>({
    title,
    addLabel,
    items,
    onAdd,
    onRemove,
    renderItem,
}: {
    title: string;
    addLabel: string;
    items: T[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    renderItem: (item: T, index: number) => React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{title}</p>
                <Button type="button" size="sm" variant="outline" onClick={onAdd}>
                    <Plus className="size-3.5" />
                    {addLabel}
                </Button>
            </div>
            {items.map((item, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2 relative">
                    <Button type="button" size="icon-sm" variant="ghost" className="absolute top-1.5 right-1.5" onClick={() => onRemove(i)}>
                        <Trash2 className="size-3.5" />
                    </Button>
                    {renderItem(item, i)}
                </div>
            ))}
        </div>
    );
}
