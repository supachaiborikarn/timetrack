--
-- PostgreSQL database dump
--

\restrict Lct4alQcNd0HgL7eMa0eG6LycUbK49ipsRd2ClJVmLie5ghuLeciCDvXa9WzXGn

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AdvanceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AdvanceStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'PAID',
    'REJECTED'
);


--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'ABSENT',
    'LEAVE'
);


--
-- Name: AvailabilityStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AvailabilityStatus" AS ENUM (
    'AVAILABLE',
    'UNAVAILABLE',
    'PREFERRED_OFF'
);


--
-- Name: EmployeeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmployeeStatus" AS ENUM (
    'ACTIVE',
    'RESIGNED',
    'SUSPENDED'
);


--
-- Name: LeaveStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeaveStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: LeaveType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeaveType" AS ENUM (
    'SICK',
    'PERSONAL',
    'VACATION',
    'OTHER'
);


--
-- Name: PayrollStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollStatus" AS ENUM (
    'DRAFT',
    'PROCESSING',
    'FINALIZED'
);


--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'HR',
    'MANAGER',
    'CASHIER',
    'EMPLOYEE'
);


--
-- Name: ShiftPoolStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShiftPoolStatus" AS ENUM (
    'OPEN',
    'CLAIMED',
    'EXPIRED',
    'CANCELLED'
);


--
-- Name: StationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StationType" AS ENUM (
    'GAS_STATION',
    'COFFEE_SHOP'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Advance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Advance" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount numeric(65,30) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    reason text,
    status public."AdvanceStatus" DEFAULT 'PENDING'::public."AdvanceStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    month integer,
    note text,
    year integer
);


--
-- Name: Announcement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Announcement" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "authorId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "targetDepartmentIds" text
);


--
-- Name: AnnouncementRead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AnnouncementRead" (
    id text NOT NULL,
    "announcementId" text NOT NULL,
    "userId" text NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "checkInTime" timestamp(3) without time zone,
    "checkInLat" numeric(65,30),
    "checkInLng" numeric(65,30),
    "checkInDeviceId" text,
    "checkInMethod" text,
    "checkOutTime" timestamp(3) without time zone,
    "checkOutLat" numeric(65,30),
    "checkOutLng" numeric(65,30),
    "checkOutDeviceId" text,
    "checkOutMethod" text,
    status public."AttendanceStatus" DEFAULT 'PENDING'::public."AttendanceStatus" NOT NULL,
    "actualHours" numeric(65,30),
    "overtimeHours" numeric(65,30),
    "lateMinutes" integer,
    "earlyLeaveMinutes" integer,
    "latePenaltyAmount" numeric(65,30) DEFAULT 0 NOT NULL,
    note text,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "breakDurationMin" integer,
    "breakEndTime" timestamp(3) without time zone,
    "breakPenaltyAmount" numeric(65,30) DEFAULT 0 NOT NULL,
    "breakStartTime" timestamp(3) without time zone
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text,
    details text,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Authenticator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Authenticator" (
    "credentialID" text NOT NULL,
    "userId" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "credentialPublicKey" text NOT NULL,
    counter integer NOT NULL,
    "credentialDeviceType" text NOT NULL,
    "credentialBackedUp" boolean NOT NULL,
    transports text
);


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Comment" (
    id text NOT NULL,
    content text NOT NULL,
    "postId" text NOT NULL,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DailyPayrollOverride; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DailyPayrollOverride" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "overrideDailyWage" numeric(65,30),
    "overrideOT" numeric(65,30),
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    adjustment numeric(65,30) DEFAULT 0,
    "overrideLatePenalty" numeric(65,30)
);


--
-- Name: Department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "stationId" text NOT NULL,
    "isFrontYard" boolean DEFAULT false NOT NULL,
    "weeklyDayOff" integer,
    "sundayEndTime" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DepartmentShift; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DepartmentShift" (
    id text NOT NULL,
    "departmentId" text NOT NULL,
    "shiftId" text NOT NULL
);


--
-- Name: EmployeeAvailability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeAvailability" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    status public."AvailabilityStatus" DEFAULT 'AVAILABLE'::public."AvailabilityStatus" NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HappinessLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HappinessLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    mood text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Leave; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Leave" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."LeaveType" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    reason text,
    status public."LeaveStatus" DEFAULT 'PENDING'::public."LeaveStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LeaveBalance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LeaveBalance" (
    id text NOT NULL,
    "userId" text NOT NULL,
    year integer NOT NULL,
    "sickLeave" integer DEFAULT 30 NOT NULL,
    "annualLeave" integer DEFAULT 6 NOT NULL,
    "personalLeave" integer DEFAULT 3 NOT NULL,
    "usedSick" integer DEFAULT 0 NOT NULL,
    "usedAnnual" integer DEFAULT 0 NOT NULL,
    "usedPersonal" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OneOnOneLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OneOnOneLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "supervisorId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    topic text NOT NULL,
    note text NOT NULL,
    "actionItems" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OvertimeRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OvertimeRequest" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    hours numeric(65,30) NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PayrollPeriod; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollPeriod" (
    id text NOT NULL,
    name text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "payDate" timestamp(3) without time zone NOT NULL,
    status public."PayrollStatus" DEFAULT 'DRAFT'::public."PayrollStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PayrollRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollRecord" (
    id text NOT NULL,
    "periodId" text NOT NULL,
    "userId" text NOT NULL,
    "workDays" integer NOT NULL,
    "totalHours" numeric(65,30) NOT NULL,
    "overtimeHours" numeric(65,30) NOT NULL,
    "basePay" numeric(65,30) NOT NULL,
    "overtimePay" numeric(65,30) NOT NULL,
    "latePenalty" numeric(65,30) DEFAULT 0 NOT NULL,
    "advanceDeduct" numeric(65,30) DEFAULT 0 NOT NULL,
    "otherDeduct" numeric(65,30) DEFAULT 0 NOT NULL,
    "netPay" numeric(65,30) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "group" text NOT NULL,
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfileEditRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileEditRequest" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "fieldName" text NOT NULL,
    "fieldLabel" text NOT NULL,
    "oldValue" text,
    "newValue" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    "rejectReason" text
);


--
-- Name: PushSubscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PushSubscription" (
    id text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ReviewPeriod; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReviewPeriod" (
    id text NOT NULL,
    title text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ReviewSubmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReviewSubmission" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "periodId" text NOT NULL,
    "selfReview" text NOT NULL,
    "managerReview" text,
    rating integer,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RolePermission" (
    id text NOT NULL,
    role public."Role" NOT NULL,
    "permissionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Shift; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Shift" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "stationId" text,
    "breakMinutes" integer DEFAULT 60 NOT NULL,
    "isNightShift" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ShiftAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShiftAssignment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "shiftId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "isDayOff" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ShiftPattern; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShiftPattern" (
    id text NOT NULL,
    name text NOT NULL,
    "departmentId" text,
    month integer NOT NULL,
    year integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "patternData" text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ShiftPool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShiftPool" (
    id text NOT NULL,
    "shiftId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "releasedBy" text NOT NULL,
    "claimedBy" text,
    reason text,
    status public."ShiftPoolStatus" DEFAULT 'OPEN'::public."ShiftPoolStatus" NOT NULL,
    "bonusAmount" numeric(65,30),
    "claimedAt" timestamp(3) without time zone,
    "expiredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ShiftSwap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShiftSwap" (
    id text NOT NULL,
    "requesterId" text NOT NULL,
    "targetId" text NOT NULL,
    "requesterDate" timestamp(3) without time zone NOT NULL,
    "targetDate" timestamp(3) without time zone NOT NULL,
    reason text,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "targetAccepted" boolean DEFAULT false NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ShiftTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShiftTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    shifts jsonb NOT NULL,
    "stationId" text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SpecialIncome; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SpecialIncome" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "shiftId" text,
    "stationId" text,
    type text NOT NULL,
    description text,
    "salesAmount" numeric(65,30),
    percentage numeric(65,30),
    amount numeric(65,30) NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Station; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Station" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    type public."StationType" NOT NULL,
    address text NOT NULL,
    latitude numeric(65,30) NOT NULL,
    longitude numeric(65,30) NOT NULL,
    radius integer DEFAULT 100 NOT NULL,
    "wifiSSID" text,
    "qrCode" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SystemConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemConfig" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TimeCorrection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimeCorrection" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "requestType" text NOT NULL,
    "requestedTime" timestamp(3) without time zone NOT NULL,
    reason text NOT NULL,
    "originalCheckIn" timestamp(3) without time zone,
    "originalCheckOut" timestamp(3) without time zone,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    username text,
    name text NOT NULL,
    email text,
    phone text,
    pin text NOT NULL,
    password text,
    role public."Role" DEFAULT 'EMPLOYEE'::public."Role" NOT NULL,
    "stationId" text,
    "departmentId" text,
    "deviceId" text,
    "photoUrl" text,
    "hourlyRate" numeric(65,30) DEFAULT 0 NOT NULL,
    "dailyRate" numeric(65,30) DEFAULT 0 NOT NULL,
    "baseSalary" numeric(65,30) DEFAULT 0 NOT NULL,
    "otRateMultiplier" numeric(65,30) DEFAULT 1.5 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "employeeStatus" public."EmployeeStatus" DEFAULT 'ACTIVE'::public."EmployeeStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    address text,
    "bankAccountNumber" text,
    "bankName" text,
    "birthDate" timestamp(3) without time zone,
    "citizenId" text,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "emergencyContactRelation" text,
    gender text,
    "isSocialSecurityRegistered" boolean DEFAULT false NOT NULL,
    "nickName" text,
    "probationEndDate" timestamp(3) without time zone,
    "registeredStationId" text,
    "socialSecurityNumber" text,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Data for Name: Advance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Advance" (id, "userId", amount, date, reason, status, "approvedBy", "approvedAt", "paidAt", "createdAt", "updatedAt", month, note, year) FROM stdin;
cmlgbbd040001jpvcd0s8fnuj	cml6ctv0x0007uqrgprf5lu7c	3500.000000000000000000000000000000	2026-02-10 08:01:43.827	\N	PENDING	\N	\N	\N	2026-02-10 08:01:43.828	2026-02-10 08:01:43.828	2	\N	2026
cmlgbbl9c0003jpvckuhi0sex	cml6ctv7w000juqrgh1tdiejn	4000.000000000000000000000000000000	2026-02-10 08:01:54.527	\N	PENDING	\N	\N	\N	2026-02-10 08:01:54.528	2026-02-10 08:01:54.528	2	\N	2026
cmlgbdmiy0005jpvcaveqbpjn	cml6ctuyp0003uqrgejbtvcmm	3500.000000000000000000000000000000	2026-02-10 08:03:29.271	\N	PENDING	\N	\N	\N	2026-02-10 08:03:29.271	2026-02-10 08:03:29.271	2	\N	2026
cmlgbg2tz0007jpvcuo2vjsqy	cml6ctuzt0005uqrgdnihhrcg	2500.000000000000000000000000000000	2026-02-10 08:05:23.714	\n	PENDING	\N	\N	\N	2026-02-10 08:05:23.715	2026-02-10 08:05:23.715	2	\N	2026
cmlgbi8wt0009jpvcdq8g57ei	cml6ctvb9000puqrgafxo42i7	5000.000000000000000000000000000000	2026-02-10 08:07:04.904	\N	PENDING	\N	\N	\N	2026-02-10 08:07:04.905	2026-02-10 08:07:04.905	2	\N	2026
cmlgdg85i0001oco4lrets0vq	cml5g1xzx001oua47iy5u23oh	3000.000000000000000000000000000000	2026-02-10 09:01:30.053	\N	PENDING	\N	\N	\N	2026-02-10 09:01:30.054	2026-02-10 09:01:30.054	2	\N	2026
cmlgdibqw0001kpftg4ypfdj9	cml5g289u003uua47ulssk26x	2500.000000000000000000000000000000	2026-02-10 09:03:08.023	\N	PENDING	\N	\N	\N	2026-02-10 09:03:08.024	2026-02-10 09:03:08.024	2	\N	2026
cmlgdiez80003kpftqwlgfip3	cml5cxygj0003v68ql9533bl3	4000.000000000000000000000000000000	2026-02-10 09:03:11.994	เงินเบิกวันที่10	PENDING	\N	\N	\N	2026-02-10 09:03:11.995	2026-02-10 09:03:11.995	2	\N	2026
cmlgdiz150001triz9ickl5ia	cml6ctvtp001puqrgr6j1clm9	4000.000000000000000000000000000000	2026-02-10 09:03:37.99	\N	PENDING	\N	\N	\N	2026-02-10 09:03:37.991	2026-02-10 09:03:37.991	2	\N	2026
cmlgdjlwg0003trizrj1ol8cq	cml5g22hz002gua47temxhj1t	1000.000000000000000000000000000000	2026-02-10 09:04:07.84	เบืกวันที่10	PENDING	\N	\N	\N	2026-02-10 09:04:07.841	2026-02-10 09:04:07.841	2	\N	2026
cmlgdktb10005kpftcl3rqtq4	cml5w8h240001ugxaadqh8irg	4000.000000000000000000000000000000	2026-02-10 09:05:04.093	\N	PENDING	\N	\N	\N	2026-02-10 09:05:04.093	2026-02-10 09:05:04.093	2	\N	2026
cmlgdkvsp0007kpft5wz02q3h	cml6ctvhm0011uqrgd2s6gv12	2000.000000000000000000000000000000	2026-02-10 09:05:07.32	\N	PENDING	\N	\N	\N	2026-02-10 09:05:07.321	2026-02-10 09:05:07.321	2	\N	2026
cmlgdlfll0009kpftmxxfqd6f	cml5g1vmh001aua47rlxc2pr1	3000.000000000000000000000000000000	2026-02-10 09:05:32.985	เงินเบิกวันที่10	PENDING	\N	\N	\N	2026-02-10 09:05:32.986	2026-02-10 09:05:32.986	2	\N	2026
cmlgdnnbs0003oco43b6v6ufr	cml6ctveb000vuqrg3ulgugaj	3000.000000000000000000000000000000	2026-02-10 09:07:16.312	\N	PENDING	\N	\N	\N	2026-02-10 09:07:16.313	2026-02-10 09:07:16.313	2	\N	2026
cmlgdowqb0001dsyh2qau2qcy	cml6ctvja0013uqrgbdjr4l0e	2500.000000000000000000000000000000	2026-02-10 09:08:15.154	\N	PENDING	\N	\N	\N	2026-02-10 09:08:15.155	2026-02-10 09:08:15.155	2	\N	2026
cmlgds9c70005oco44qfy7tff	cml6ctv3c000buqrguslcci85	3500.000000000000000000000000000000	2026-02-10 09:10:51.462	\N	PENDING	\N	\N	\N	2026-02-10 09:10:51.463	2026-02-10 09:10:51.463	2	\N	2026
cmlgdulw60003dsyhkixkjdu6	cml6ctvcw000tuqrgj8clzpzz	3500.000000000000000000000000000000	2026-02-10 09:12:41.046	\N	PENDING	\N	\N	\N	2026-02-10 09:12:41.047	2026-02-10 09:12:41.047	2	\N	2026
cmlgfm74d0001r8mn0r7dsmhx	cml6ctuwf0001uqrgn7ktp9je	3000.000000000000000000000000000000	2026-02-10 10:02:07.885	\N	PENDING	\N	\N	\N	2026-02-10 10:02:07.886	2026-02-10 10:02:07.886	2	\N	2026
cmlgi2o3d0001fswfas4wn4bm	cml6ctvff000xuqrgvuiy6k2z	4000.000000000000000000000000000000	2026-02-10 11:10:55.608	\N	PENDING	\N	\N	\N	2026-02-10 11:10:55.61	2026-02-10 11:10:55.61	2	\N	2026
cmlgi3xqu0007r8mnzsq4tpap	cml6ctv4g000duqrgdybgtyte	3500.000000000000000000000000000000	2026-02-10 11:11:54.541	\N	PENDING	\N	\N	\N	2026-02-10 11:11:54.544	2026-02-10 11:11:54.544	2	\N	2026
cmlgi9vso0003fswfrla0b0iu	cml6ctv5n000fuqrg94t826wg	3500.000000000000000000000000000000	2026-02-10 11:16:32.184	ประจําเดือน	PENDING	\N	\N	\N	2026-02-10 11:16:32.185	2026-02-10 11:16:32.185	2	\N	2026
cmlgk86dz0003tf484odzodt7	cml6ctva5000nuqrg8wh05sro	3500.000000000000000000000000000000	2026-02-10 12:11:11.616	\N	PENDING	\N	\N	\N	2026-02-10 12:11:11.617	2026-02-10 12:11:11.617	2	\N	2026
cmlhsih4500018y3qygv4pbd0	cml6ctvgi000zuqrguiuyi2de	3000.000000000000000000000000000000	2026-02-11 08:50:55.184	\N	PENDING	\N	\N	\N	2026-02-11 08:50:55.185	2026-02-11 08:50:55.185	2	\N	2026
cmlx3yyyq0003vbcxifnr503d	cml6ctuwf0001uqrgn7ktp9je	3000.000000000000000000000000000000	2026-02-22 02:08:13.234	เบิกรอบ2\n	PENDING	\N	\N	\N	2026-02-22 02:08:13.235	2026-02-22 02:08:13.235	2	\N	2026
cmlx78hpg006jqi9uqxodi91x	cml5g22hz002gua47temxhj1t	1000.000000000000000000000000000000	2026-02-22 03:39:36.261	\N	PENDING	\N	\N	\N	2026-02-22 03:39:36.262	2026-02-22 03:39:36.262	2	\N	2026
cmlx79mh3006lqi9u7tki7l75	cml5g1tky000wua47qqpf53wn	4000.000000000000000000000000000000	2026-02-22 03:40:29.098	\N	PENDING	\N	\N	\N	2026-02-22 03:40:29.099	2026-02-22 03:40:29.099	2	\N	2026
cmlx7apln001pcjj74senpl0z	cml5g289u003uua47ulssk26x	2500.000000000000000000000000000000	2026-02-22 03:41:19.796	\N	PENDING	\N	\N	\N	2026-02-22 03:41:19.797	2026-02-22 03:41:19.797	2	\N	2026
cmlx7bjl4001rcjj7isxclx3b	cml5g1tky000wua47qqpf53wn	4000.000000000000000000000000000000	2026-02-22 03:41:58.887	\N	PENDING	\N	\N	\N	2026-02-22 03:41:58.888	2026-02-22 03:41:58.888	2	\N	2026
\.


--
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Announcement" (id, title, content, "authorId", "isActive", "createdAt", "updatedAt", "isPinned", "targetDepartmentIds") FROM stdin;
cmladexfp00014f9u2347lnaf	แจ้งกะกลางคืนที่ศุภชัย	เวลาพักเบรคให่เริ่มพักได้หลังจาก 23.00 น. ไปแล้วเท่านั้น	cml61rz7u000111dofdoy94sd	t	2026-02-06 04:13:52.239	2026-02-06 04:13:52.239	f	\N
cmlvsxyai00011kbp436muw5v	เรื่องการรับเซล	แจ้งเตือนการทำงาน หากรับเซลไม่ผ่านมีบทลงโทษพักงาน 7 วัน หากรับไม่ผ่าน 2 ครั้งพิจารณาพักงาน 1 เดือน รับไม่ผ่าน 3 ครั้งพิจารณาให้ออก	cml61rz7u000111dofdoy94sd	t	2026-02-21 04:11:43.962	2026-02-21 04:11:43.962	f	\N
cmlvu3lh000011coctosrlc0z	เรื่องการรับเซล	แจ้งเตือนการทำงาน หากรับเซลไม่ผ่านมีบทลงโทษพักงาน 7 วัน หากรับไม่ผ่าน 2 ครั้งพิจารณาพักงาน 1 เดือน รับไม่ผ่าน 3 ครั้งพิจารณาให้ออก	cml61rz7u000111dofdoy94sd	t	2026-02-21 04:44:06.901	2026-02-21 04:44:06.901	t	\N
cmlw3hsh90001oiv1939db73y	พักเบรก	เวลาพักเบรก ต้องรอให้พนักงานทุกคนเข้ากะมาก่อน ไม่สามารถแบ่งเวลาพักไปส่งลูกในเวลาที่รถกำลังเข้าและพนักงานยังมาไม่ครบเด็ดขาด หากพนักงานที่ไม่สะดวกเข้างานเช้าเพราะต้องส่งลูกให้แจ้งมาเพื่อจัดให้เข้ากะที่เหมาะสมต่อไป	cml61rz7u000111dofdoy94sd	t	2026-02-21 09:07:05.497	2026-02-21 09:07:05.497	f	\N
cmlw3qlsw0001urp8jzvhbtq2	พักเบรก	เวลาพักเบรก ต้องรอให้พนักงานทุกคนเข้ากะมาก่อน ไม่สามารถแบ่งเวลาพักไปส่งลูกในเวลาที่รถกำลังเข้าและพนักงานยังมาไม่ครบเด็ดขาด หากพนักงานที่ไม่สะดวกเข้างานเช้าเพราะต้องส่งลูกให้แจ้งมาเพื่อจัดให้เข้ากะที่เหมาะสมต่อไป	cml61rz7u000111dofdoy94sd	t	2026-02-21 09:13:56.96	2026-02-21 09:13:56.96	f	["cml5byaor000t14m6ik3csf83","cml5byas8000x14m66o2b3vd3","cml5g1o4u0002ua47camd41dk","cml5bya6x000h14m6lysk7qbh","cml5byaaj000j14m6lxzgng16","cml5byb2h001514m6oezn2e06","cml5byb4f001714m6fozklfm3"]
\.


--
-- Data for Name: AnnouncementRead; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnnouncementRead" (id, "announcementId", "userId", "readAt") FROM stdin;
cmlvu3sxi0001uq6p1acdnr0l	cmlvu3lh000011coctosrlc0z	cml61rz7u000111dofdoy94sd	2026-02-21 04:44:16.567
cmlvuk7lb0007uq6p8mkf35ip	cmlvu3lh000011coctosrlc0z	cml6ctvms0019uqrg4ft54y7j	2026-02-21 04:57:01.852
cmlvulxgn000buq6pn5goc8vv	cmlvu3lh000011coctosrlc0z	cml6ctvp6001fuqrgjo0cut8g	2026-02-21 04:58:22.247
cmlvunnlr000duq6pvdp3pqfq	cmlvu3lh000011coctosrlc0z	cml6ctvqa001huqrgn8fa8qe5	2026-02-21 04:59:42.783
cmlvurvxu00259q91ty8xyy63	cmlvu3lh000011coctosrlc0z	cml6cv8sm000313l7yhueq5zy	2026-02-21 05:03:00.21
cmlvusjij000huq6p53im84wf	cmlvu3lh000011coctosrlc0z	cml6ctuzt0005uqrgdnihhrcg	2026-02-21 05:03:30.763
cmlvuvl3o001fs33yprctfrh5	cmlvu3lh000011coctosrlc0z	cml6ctvhm0011uqrgd2s6gv12	2026-02-21 05:05:52.788
cmlvw7zia0001onzj1m5ya78g	cmlvu3lh000011coctosrlc0z	cml5cxygj0003v68ql9533bl3	2026-02-21 05:43:30.735
cmlvwfs8x000pj6bue7ccfhnb	cmlvu3lh000011coctosrlc0z	cml6ctvlp0017uqrgl43h68pm	2026-02-21 05:49:34.564
cmlvwkbqj000tj6buza2g65d9	cmlvu3lh000011coctosrlc0z	cml5g1vmh001aua47rlxc2pr1	2026-02-21 05:53:06.456
cmlvwm2p2000312vpoat3dk8s	cmlvu3lh000011coctosrlc0z	cml6ctv6r000huqrg08xd4xcm	2026-02-21 05:54:28.262
cmlvwnyno000xj6bu11kay2pz	cmlvu3lh000011coctosrlc0z	cml5g289u003uua47ulssk26x	2026-02-21 05:55:54.987
cmlvwo8x7000912vppk30c9c4	cmlvu3lh000011coctosrlc0z	cml6ctvwy001xuqrgl2hwd8y1	2026-02-21 05:56:09.435
cmlvwtu0v0017j6buzmww7nuf	cmlvu3lh000011coctosrlc0z	cml6ctvgi000zuqrguiuyi2de	2026-02-21 06:00:30.059
cmlvx4kbz002fj6bum4j9jzg9	cmlvu3lh000011coctosrlc0z	cml6ctv270009uqrg7spxr9d4	2026-02-21 06:08:50.927
cmlvxtl7c000r12vpynxw305o	cmlvu3lh000011coctosrlc0z	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:28:17.195
cmlvyh3ba000112zqs7lwwuw1	cmlvu3lh000011coctosrlc0z	cml6ctvkk0015uqrg9iuy6dh1	2026-02-21 06:46:34.792
cmlvz36ag00012r48pssve64j	cmlvu3lh000011coctosrlc0z	cml5g22hz002gua47temxhj1t	2026-02-21 07:03:44.045
cmlw033pf0003l0367vd17w2p	cmlvu3lh000011coctosrlc0z	cml6ctvja0013uqrgbdjr4l0e	2026-02-21 07:31:41.572
cmlw09atn0001k2i1ih68texv	cmlvu3lh000011coctosrlc0z	cml5w8h240001ugxaadqh8irg	2026-02-21 07:36:30.732
cmlw5d9dp0001idexubxlx3lz	cmlvu3lh000011coctosrlc0z	cml6ctvtp001puqrgr6j1clm9	2026-02-21 09:59:33.565
cmlw5dunb0001zsbm0udu8f86	cmlvu3lh000011coctosrlc0z	cml6cv8w4000913l7imruilgz	2026-02-21 10:00:01.127
cmlw5e3gc0003zsbm1h9kzf45	cmlvu3lh000011coctosrlc0z	cml6ctvsk001nuqrgooayfxde	2026-02-21 10:00:12.54
cmlw5g4ft000bzsbmqckd7qg3	cmlvu3lh000011coctosrlc0z	cml6ctvrh001luqrg60imh1k9	2026-02-21 10:01:47.129
cmlw5sm1w000364ykwldf6aq3	cmlvu3lh000011coctosrlc0z	cml6ctuwf0001uqrgn7ktp9je	2026-02-21 10:11:29.828
cmlw5t6e9000764ykf8bplpz3	cmlvu3lh000011coctosrlc0z	cml6cv8qd000113l7pz55vip3	2026-02-21 10:11:56.193
cmlw6cu4x000d64ykp1kli493	cmlvu3lh000011coctosrlc0z	cml6cv8ts000513l7uydg8j16	2026-02-21 10:27:13.426
cmlw6kku4000h64yk3j64hs6f	cmlvu3lh000011coctosrlc0z	cml5g20im0022ua4780xu5bou	2026-02-21 10:33:14.386
cmlw71a3x0001i02i0ehrjhf7	cmlvu3lh000011coctosrlc0z	cml6ctvz80021uqrghd4qf3t2	2026-02-21 10:46:13.869
cmlw7p5160001133yd2r3wurk	cmlvu3lh000011coctosrlc0z	cml6ctv5n000fuqrg94t826wg	2026-02-21 11:04:47.034
cmlw80us70001ppr51srq5rn0	cmlvu3lh000011coctosrlc0z	cml6ctv3c000buqrguslcci85	2026-02-21 11:13:53.623
cmlw9xsfp000711unq6120s88	cmlvu3lh000011coctosrlc0z	cml6ctvnx001buqrgfzjexn6r	2026-02-21 12:07:29.846
cmlwb3653000dppr5llt5yvxb	cmlvu3lh000011coctosrlc0z	cml6ctva5000nuqrg8wh05sro	2026-02-21 12:39:40.503
cmlwb748e000fppr5y62hfyzg	cmlvu3lh000011coctosrlc0z	cml6ctuyp0003uqrgejbtvcmm	2026-02-21 12:42:44.655
cmlwvsth300016y33mynegux6	cmlvu3lh000011coctosrlc0z	cml5g1qzg000iua472zcpgugd	2026-02-21 22:19:29.463
cmlww5awq00036u12uqplfel1	cmlvu3lh000011coctosrlc0z	cml6ctveb000vuqrg3ulgugaj	2026-02-21 22:29:11.931
cmlwya43k000d6u12n51m0td2	cmlvu3lh000011coctosrlc0z	cml5g1xzx001oua47iy5u23oh	2026-02-21 23:28:55.616
cmlwybxu0000f6u12rykiqckw	cmlvu3lh000011coctosrlc0z	cml6cv8uy000713l7zocqn0fn	2026-02-21 23:30:20.585
cmlwzrfp2000j6u12923r8adc	cmlvu3lh000011coctosrlc0z	cml6ctv0x0007uqrgprf5lu7c	2026-02-22 00:10:23.414
cmlwzupum000l6u12hg2dcbal	cmlvu3lh000011coctosrlc0z	cml5waf57000114p7u4pb0j1l	2026-02-22 00:12:56.542
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Attendance" (id, "userId", date, "checkInTime", "checkInLat", "checkInLng", "checkInDeviceId", "checkInMethod", "checkOutTime", "checkOutLat", "checkOutLng", "checkOutDeviceId", "checkOutMethod", status, "actualHours", "overtimeHours", "lateMinutes", "earlyLeaveMinutes", "latePenaltyAmount", note, "approvedBy", "approvedAt", "createdAt", "updatedAt", "breakDurationMin", "breakEndTime", "breakPenaltyAmount", "breakStartTime") FROM stdin;
cmlbrquzj0001249pny9z2nqa	cml6ctvwy001xuqrgl2hwd8y1	2026-02-07 00:00:00	2026-02-07 01:00:00	\N	\N	\N	ADMIN_EDIT	2026-02-14 05:37:18.085	16.455098400000000000000000000000	99.530103400000000000000000000000	-wfhbzg	GPS	APPROVED	171.620000000000000000000000000000	163.620000000000000000000000000000	\N	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-07 03:42:49.951	2026-02-14 05:37:19.371	\N	\N	0.000000000000000000000000000000	\N
cmlh6mvwa000111shuk2tf9bs	cml6ctvff000xuqrgvuiy6k2z	2026-02-11 00:00:00	2026-02-11 01:59:00	\N	\N	\N	MANUAL	2026-02-11 14:04:00	\N	\N	\N	MANUAL	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-10 22:38:29.626	2026-02-11 14:04:49.362	\N	\N	0.000000000000000000000000000000	\N
cmldw157m0001q3atc45uva7g	cml6ctv90000luqrg6v3qvfs7	2026-02-08 00:00:00	2026-02-08 15:17:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	17	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-08 15:18:20.578	2026-02-08 15:18:20.578	\N	\N	0.000000000000000000000000000000	\N
cmlbnwi2o0001rvl2qfzo9ppi	cml5g1tky000wua47qqpf53wn	2026-02-07 00:00:00	2026-02-07 01:54:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	174	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-07 01:55:14.688	2026-02-07 01:55:14.688	\N	\N	0.000000000000000000000000000000	\N
cmld3hnid00051brhdy8hi2r1	cml6ctvja0013uqrgbdjr4l0e	2026-02-07 17:00:00	2026-02-08 01:59:21.501	16.455051000000000000000000000000	99.529944700000000000000000000000	-xk7lgp	QR	2026-02-08 13:55:07.33	16.455085200000000000000000000000	99.530133400000000000000000000000	cs669g	GPS	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-08 05:55:41.069	2026-02-08 01:59:21.925	2026-02-08 13:55:07.752	90	2026-02-08 09:01:03.917	0.000000000000000000000000000000	2026-02-08 07:30:40.043
cmlahggt70001mjdy4ta06m81	cml61rz7u000111dofdoy94sd	2026-02-05 17:00:00	2026-02-06 06:07:02.254	16.475068859022090000000000000000	99.553411969032350000000000000000	-a7615o	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 06:07:02.684	2026-02-07 00:05:30.441	19	2026-02-06 06:27:24.134	0.000000000000000000000000000000	2026-02-06 06:07:25.33
cmla63k630001a92x8ud00603	cml6ctvqa001huqrgn8fa8qe5	2026-02-05 17:00:00	2026-02-06 00:49:04.298	16.455277700000000000000000000000	99.529979200000000000000000000000	g3up74	QR	2026-02-06 10:01:29.624	16.455068900000000000000000000000	99.530242500000000000000000000000	-maw8xk	GPS	APPROVED	8.199999999999999000000000000000	0.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 00:49:04.731	2026-02-07 00:05:30.441	\N	\N	0.000000000000000000000000000000	\N
cmlugammh0001zegeei66pnjh	cml5cxygj0003v68ql9533bl3	2026-02-19 17:00:00	2026-02-20 05:29:53.72	16.475064300000000000000000000000	99.553450900000000000000000000000	ymf41f	QR	2026-02-20 14:39:00.533	16.475146900000000000000000000000	99.553812200000000000000000000000	ymf41f	GPS	APPROVED	8.150000000000000000000000000000	0.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 05:29:54.185	2026-02-21 00:51:17.252	\N	\N	0.000000000000000000000000000000	\N
cmlvt5w57000n1kbpbgg9xh79	cml6ctvgi000zuqrguiuyi2de	2026-02-04 17:00:00	2026-02-05 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:17:54.427	2026-02-21 04:17:54.427	\N	\N	0.000000000000000000000000000000	\N
cmlauppos0001psnipqj0puz8	cml6ctvms0019uqrg4ft54y7j	2026-02-06 00:00:00	2026-02-06 00:00:00	\N	\N	\N	MANUAL	2026-02-06 12:00:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-06 12:18:09.1	2026-02-06 12:18:30.009	\N	\N	0.000000000000000000000000000000	\N
cmlaayoxf0001x31hfe5jpmxu	cml6ctvff000xuqrgvuiy6k2z	2026-02-06 00:00:00	2026-02-06 02:00:00	\N	\N	\N	MANUAL	2026-02-06 14:00:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 08:57:39.587	2026-02-06 03:05:15.699	2026-02-06 13:55:06.727	\N	\N	0.000000000000000000000000000000	\N
cmld3hdtr00031brhxnmnvojm	cml6ctvgi000zuqrguiuyi2de	2026-02-07 17:00:00	2026-02-08 01:59:08.949	16.455111100000000000000000000000	99.530127600000000000000000000000	-1n18s4	QR	2026-02-08 13:55:08.665	16.455100000000000000000000000000	99.530077400000000000000000000000	hl88nd	GPS	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-08 05:55:45.675	2026-02-08 01:59:09.375	2026-02-08 13:55:09.087	88	2026-02-08 05:59:33.259	0.000000000000000000000000000000	2026-02-08 04:30:36.006
cmla4lco6000d4e16pntz4kn4	cml6ctvms0019uqrg4ft54y7j	2026-02-05 17:00:00	2026-02-06 00:06:55.17	16.455085100000000000000000000000	99.530104499999990000000000000000	-1n18s4	QR	2026-02-06 12:01:31.821	16.455101700000000000000000000000	99.530017300000000000000000000000	-v747np	GPS	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 13:56:13.617	2026-02-06 00:06:55.59	2026-02-06 13:56:13.617	59	2026-02-06 06:01:05.291	0.000000000000000000000000000000	2026-02-06 05:01:25.001
cml7p24km000514lzszim1h2t	cml6ctvwy001xuqrgl2hwd8y1	2026-02-04 00:00:00	2026-02-04 07:16:31.619	16.475176900000000000000000000000	99.553653299999990000000000000000	-wfhbzg	QR	2026-02-04 10:30:33.208	16.475168800000000000000000000000	99.553750699999990000000000000000	-wfhbzg	GPS	APPROVED	2.230000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml61rz7u000111dofdoy94sd	2026-02-04 12:02:21.411	2026-02-04 07:16:32.038	2026-02-04 12:02:21.412	\N	\N	0.000000000000000000000000000000	2026-02-04 14:33:24.149
cml7oxxbd000314lzgapp7x5n	cml5g1qzg000iua472zcpgugd	2026-02-04 00:00:00	2026-02-04 07:13:15.582	16.475180600000000000000000000000	99.553666100000000000000000000000	-8s2lny	QR	2026-02-04 11:02:07.986	16.475070700000000000000000000000	99.553714200000000000000000000000	-8s2lny	GPS	APPROVED	2.800000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml61rz7u000111dofdoy94sd	2026-02-04 12:02:38.602	2026-02-04 07:13:16.009	2026-02-04 12:02:38.603	\N	\N	0.000000000000000000000000000000	\N
cmlecl15b0005kwp4tr2k75od	cml6ctv3c000buqrguslcci85	2026-02-08 17:00:00	2026-02-08 23:01:41.871	16.436565627287120000000000000000	99.511610511159760000000000000000	gg44cx	QR	2026-02-09 11:10:00	16.436399062929060000000000000000	99.511361676415690000000000000000	gg44cx	MANUAL	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:01:42.287	2026-02-21 03:18:01.8	59	2026-02-09 04:04:32.83	0.000000000000000000000000000000	2026-02-09 03:05:02.489
cmld0rmdw0001cwx9gts4kuet	cml6ctvb9000puqrgafxo42i7	2026-02-07 17:00:00	2026-02-08 00:43:07.729	16.436254000000000000000000000000	99.512064200000000000000000000000	-xgf12i	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 00:43:08.181	2026-02-09 00:43:30.465	\N	\N	0.000000000000000000000000000000	\N
cmlmccych0001vny3astw49s4	cml6ctv7w000juqrgh1tdiejn	2026-02-14 00:00:00	2026-02-14 05:50:00	\N	\N	\N	MANUAL	2026-02-15 23:11:34.538	16.436470700000000000000000000000	99.511521300000000000000000000000	rcqple	GPS	APPROVED	40.350000000000000000000000000000	32.350000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-14 13:17:34.816	2026-02-15 23:11:35.456	\N	\N	0.000000000000000000000000000000	\N
cmlvqzdmz000jr6we6eph4zjd	cml6ctvwy001xuqrgl2hwd8y1	2026-02-04 17:00:00	2026-02-04 22:30:00	\N	\N	\N	ADMIN_EDIT	2026-02-05 10:30:00	\N	\N	\N	ADMIN_EDIT	APPROVED	12.000000000000000000000000000000	\N	\N	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 03:16:51.275	2026-02-22 00:41:03.355	\N	\N	0.000000000000000000000000000000	\N
cmlaazbh20003x31hd8k9u2gn	cml6ctv0x0007uqrgprf5lu7c	2026-02-05 17:00:00	2026-02-06 03:05:44.497	16.436336110427800000000000000000	99.511796831398900000000000000000	-85vz5c	QR	2026-02-06 12:08:17.883	16.436339040916710000000000000000	99.511801660188370000000000000000	-85vz5c	GPS	APPROVED	8.029999999999999000000000000000	0.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 03:05:44.918	2026-02-07 00:05:30.441	55	2026-02-06 07:04:38.128	0.000000000000000000000000000000	2026-02-06 06:09:21.163
cmla8nvdn00052dpdevcj1h2p	cml5g289u003uua47ulssk26x	2026-02-05 17:00:00	2026-02-06 02:00:50.97	16.475331900000000000000000000000	99.553650100000000000000000000000	ktr8uu	QR	2026-02-06 13:55:48.064	16.475116100000000000000000000000	99.553827600000010000000000000000	ktr8uu	GPS	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	60	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 02:00:51.612	2026-02-07 00:05:30.441	\N	\N	0.000000000000000000000000000000	2026-02-06 06:03:53.388
cmlbghopu0001bvkxoeysockz	cml6ctvkk0015uqrg9iuy6dh1	2026-02-06 17:00:00	2026-02-06 22:27:45.697	16.455202214596120000000000000000	99.530127793069170000000000000000	phfpd5	QR	2026-02-07 06:43:08.589	16.454923416822430000000000000000	99.530330363801010000000000000000	phfpd5	GPS	APPROVED	7.250000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 22:27:46.146	2026-02-07 06:43:10.793	\N	\N	0.000000000000000000000000000000	\N
cmlbgnesc0003uzl7pz576rbq	cml6ctvff000xuqrgvuiy6k2z	2026-02-07 00:00:00	2026-02-06 22:31:00	\N	\N	\N	MANUAL	2026-02-07 10:32:00	\N	\N	\N	MANUAL	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-06 22:32:13.212	2026-02-07 10:33:31.109	\N	\N	0.000000000000000000000000000000	\N
cmlbjhhbp000fuzl79e6pxn92	cml6ctuwf0001uqrgn7ktp9je	2026-02-06 17:00:00	2026-02-06 23:51:34.73	16.436213900000000000000000000000	99.512069600000000000000000000000	4uyosu	QR	2026-02-07 10:01:17.777	16.436345100000000000000000000000	99.512104400000000000000000000000	4uyosu	GPS	APPROVED	9.150000000000000000000000000000	1.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 23:51:35.414	2026-02-07 10:01:18.412	\N	\N	0.000000000000000000000000000000	\N
cmlbjbl5f000duzl7lxaawk3n	cml6cv8sm000313l7yhueq5zy	2026-02-06 17:00:00	2026-02-06 23:46:59.982	16.455052900000000000000000000000	99.530159299999990000000000000000	-oka4kb	QR	2026-02-07 10:03:19.635	16.455057600000000000000000000000	99.530128899999990000000000000000	jl0pv7	GPS	APPROVED	9.270000000000000000000000000000	1.270000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 23:47:00.436	2026-02-07 10:03:20.068	\N	\N	0.000000000000000000000000000000	\N
cmlbjiala000huzl7xvbn0mic	cml6ctvms0019uqrg4ft54y7j	2026-02-06 17:00:00	2026-02-06 23:52:12.886	16.455019400000000000000000000000	99.529765100000010000000000000000	-1n18s4	QR	2026-02-07 11:27:36.97	16.455097700000000000000000000000	99.530005700000000000000000000000	-v747np	GPS	APPROVED	10.580000000000000000000000000000	2.580000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	cml6ctvcw000tuqrgj8clzpzz	2026-02-07 06:02:34.767	2026-02-06 23:52:13.342	2026-02-07 11:27:37.421	55	2026-02-07 06:02:44.651	0.000000000000000000000000000000	2026-02-07 05:06:56.775
cmlbnyw1w0003pmw5r20vlbxt	cml6ctvja0013uqrgbdjr4l0e	2026-02-06 17:00:00	2026-02-07 01:57:05.673	16.455089300000000000000000000000	99.530125200000000000000000000000	-xk7lgp	QR	2026-02-07 13:56:48.018	16.455051600000000000000000000000	99.530152800000000000000000000000	cs669g	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-07 09:00:21.38	2026-02-07 01:57:06.117	2026-02-07 13:56:48.476	90	2026-02-07 09:00:19.482	0.000000000000000000000000000000	2026-02-07 07:29:28.376
cmlcgojsp0001n2b56hw9bgq1	cml6ctv90000luqrg6v3qvfs7	2026-02-07 00:00:00	2026-02-07 15:20:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	20	\N	0.000000000000000000000000000000	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-07 23:20:09.169	2026-02-07 15:20:52.322	2026-02-07 23:20:09.17	\N	\N	0.000000000000000000000000000000	\N
cml646bwh0001i3uiyqfa9r3e	cml5cwfpj0001v68q0h16va0v	2026-02-03 00:00:00	2026-02-03 11:44:09.188	16.475434357308060000000000000000	99.553539999247520000000000000000	-x0jg9j	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-03 04:44:10.049	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml8niezv0001tth2i13lh5jb	cml6ctvb9000puqrgafxo42i7	2026-02-05 17:00:00	2026-02-05 19:00:00	16.436216500000000000000000000000	99.511895300000010000000000000000	-xgf12i	QR	2026-02-05 12:03:37.061	16.436316200000000000000000000000	99.511933099999990000000000000000	-xgf12i	GPS	APPROVED	11.700000000000000000000000000000	3.700000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml61rz7u000111dofdoy94sd	2026-02-05 12:18:58.227	2026-02-04 23:20:58.987	2026-02-06 01:38:45.617	\N	\N	0.000000000000000000000000000000	\N
cmleg3ml70001mntctq09bebc	cml6ctvrh001luqrg60imh1k9	2026-02-08 17:00:00	2026-02-09 00:40:08.035	16.475179600000000000000000000000	99.553633500000000000000000000000	-tvo3gw	GPS	2026-02-13 10:00:59.169	16.475187300000000000000000000000	99.553646300000000000000000000000	-tvo3gw	GPS	APPROVED	104.330000000000000000000000000000	96.330000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-09 00:40:08.732	2026-02-13 10:01:00.532	\N	\N	0.000000000000000000000000000000	\N
cml9aqa000001dfaeclls79pd	cml6ctvgi000zuqrguiuyi2de	2026-02-05 00:00:00	2026-02-05 10:10:56.504	16.455024000000000000000000000000	99.529966900000010000000000000000	-1n18s4	QR	2026-02-14 10:34:00.158	16.455087100000000000000000000000	99.530116400000000000000000000000	hl88nd	GPS	APPROVED	215.380000000000000000000000000000	207.380000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 10:10:56.928	2026-02-14 10:34:00.593	\N	\N	0.000000000000000000000000000000	2026-02-05 17:12:11.462
cmldbvse70001wrupqiytkowl	cml6ctvlp0017uqrgl43h68pm	2026-02-07 17:00:00	2026-02-08 05:54:17.918	16.455099000000000000000000000000	99.530092999999990000000000000000	-jkouny	QR	2026-02-08 14:00:41.574	16.454749700000000000000000000000	99.530173700000010000000000000000	-jkouny	GPS	APPROVED	7.100000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-08 05:54:47.147	2026-02-08 05:54:18.367	2026-02-08 14:00:42	\N	\N	0.000000000000000000000000000000	\N
cmlegy5fk0003mntcd8b27c07	cml5g1tky000wua47qqpf53wn	2026-02-09 00:00:00	2026-02-09 01:02:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	92	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-09 01:03:52.832	2026-02-09 01:03:52.832	\N	\N	0.000000000000000000000000000000	\N
cmla0z4if000178vdzuqy67od	cml6ctveb000vuqrg3ulgugaj	2026-02-05 17:00:00	2026-02-05 22:25:39.279	16.455096500000000000000000000000	99.530135300000000000000000000000	-c3lq7g	QR	2026-02-06 13:57:47.252	16.455092400000000000000000000000	99.530108100000010000000000000000	-e3b1at	GPS	APPROVED	14.530000000000000000000000000000	6.530000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 13:56:48.414	2026-02-05 22:25:39.735	2026-02-06 13:57:47.7	\N	\N	0.000000000000000000000000000000	\N
cmla20ov70003h32hz0uo0czf	cml6ctvnx001buqrgfzjexn6r	2026-02-05 17:00:00	2026-02-05 22:54:51.957	16.455101000000000000000000000000	99.530094800000000000000000000000	-3nueuy	QR	2026-02-06 12:56:46.316	16.454906700000000000000000000000	99.530036700000000000000000000000	-3nueuy	GPS	APPROVED	13.020000000000000000000000000000	5.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 13:56:41.884	2026-02-05 22:54:52.387	2026-02-06 13:56:41.885	\N	\N	0.000000000000000000000000000000	\N
cml659dz4000111vwngzv3epu	cml5g289u003uua47ulssk26x	2026-02-03 00:00:00	2026-02-03 05:14:31.447	16.475608449794130000000000000000	99.553361806412810000000000000000	-a7615o	QR	2026-02-15 01:06:19.892	16.475231600000000000000000000000	99.553597600000000000000000000000	ktr8uu	GPS	APPROVED	282.850000000000000000000000000000	274.850000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-03 05:14:32.32	2026-02-15 01:06:20.53	\N	\N	0.000000000000000000000000000000	\N
cml7oxsqr000114lz3s6kvvmp	cml5cxygj0003v68ql9533bl3	2026-02-04 00:00:00	2026-02-04 07:13:09.656	16.475183000000000000000000000000	99.553653000000000000000000000000	-wfhbzg	QR	2026-02-15 05:41:41.608	16.475175800000000000000000000000	99.553631800000010000000000000000	-wfhbzg	GPS	APPROVED	261.470000000000000000000000000000	253.470000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 07:13:10.083	2026-02-15 05:41:42.041	\N	\N	0.000000000000000000000000000000	\N
cml7pma65000914lz4u08ft4l	cml6cv8uy000713l7zocqn0fn	2026-02-04 00:00:00	2026-02-04 07:32:11.568	16.475177300000000000000000000000	99.553629900000000000000000000000	-trvj2p	QR	2026-02-15 10:03:12.675	16.475184800000000000000000000000	99.553634000000000000000000000000	-trvj2p	GPS	APPROVED	265.520000000000000000000000000000	257.520000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 07:32:12.414	2026-02-15 10:03:13.535	\N	\N	0.000000000000000000000000000000	\N
cmla4adg900094e169779735a	cml6cv8sm000313l7yhueq5zy	2026-02-05 17:00:00	2026-02-05 23:58:22.952	16.455081200000000000000000000000	99.530123600000000000000000000000	-9jy4gm	QR	2026-02-06 10:04:24.811	16.455008100000000000000000000000	99.530178000000010000000000000000	jl0pv7	GPS	APPROVED	9.100000000000000000000000000000	1.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 13:56:32.831	2026-02-05 23:58:23.385	2026-02-06 13:56:32.832	\N	\N	0.000000000000000000000000000000	\N
cml8n89nm0001e6xerpsp1nt1	cml6ctv3c000buqrguslcci85	2026-02-05 00:00:00	2026-02-04 23:13:05.075	16.436534818326860000000000000000	99.511647661595520000000000000000	-xkcrlf	QR	2026-02-05 11:15:00	16.436314919207570000000000000000	99.511574971201850000000000000000	gg44cx	MANUAL	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 23:13:05.506	2026-02-21 03:16:54.931	\N	\N	0.000000000000000000000000000000	\N
cmla2chac0009h32hki5uhub8	cml6ctvhm0011uqrgd2s6gv12	2026-02-05 17:00:00	2026-02-05 23:04:01.264	16.455069500000000000000000000000	99.530138300000000000000000000000	g6sqmk	QR	2026-02-06 11:01:35.597	16.455021100000000000000000000000	99.530034400000010000000000000000	qvxl8t	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 13:56:37.332	2026-02-05 23:04:02.437	2026-02-06 13:56:37.333	86	2026-02-06 06:01:35.382	0.000000000000000000000000000000	2026-02-06 04:35:11.167
cmldbtyrm0001rtrrikb3r9jv	cml6ctv6r000huqrg08xd4xcm	2026-02-07 17:00:00	2026-02-08 05:52:52.89	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	QR	2026-02-08 15:26:15.771	16.436342453014470000000000000000	99.511636979211190000000000000000	579pd4	GPS	APPROVED	8.550000000000001000000000000000	0.550000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 05:52:53.314	2026-02-09 00:43:30.465	\N	\N	0.000000000000000000000000000000	\N
cmldlxllo000110uk2culc1u6	cml6ctvz80021uqrghd4qf3t2	2026-02-07 17:00:00	2026-02-08 10:35:38.614	16.475357800000000000000000000000	99.553675000000000000000000000000	-erjiz0	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 10:35:39.036	2026-02-09 00:43:30.465	\N	\N	0.000000000000000000000000000000	\N
cmlvtspol00099q91os4eun0w	cml6ctuzt0005uqrgdnihhrcg	2026-01-29 17:00:00	2026-01-29 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 11:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:39.141	2026-02-21 04:35:39.141	\N	\N	0.000000000000000000000000000000	\N
cml646lr80003i3uigvf4j75h	cml5w8h240001ugxaadqh8irg	2026-02-03 00:00:00	2026-02-03 11:44:22.361	16.475279200000000000000000000000	99.553456999999990000000000000000	-zcd007	QR	2026-02-15 22:58:36.807	16.475363700000000000000000000000	99.553652500000000000000000000000	vpjg0o	GPS	APPROVED	298.230000000000000000000000000000	290.230000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-03 04:44:22.821	2026-02-15 22:58:37.24	\N	\N	0.000000000000000000000000000000	\N
cmlvtspvn000b9q913gcr0nyq	cml6ctvhm0011uqrgd2s6gv12	2026-01-26 17:00:00	2026-01-27 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:39.395	2026-02-21 04:35:39.395	\N	\N	0.000000000000000000000000000000	\N
cmlr6hhnw0003dey8072nr0es	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 17:00:00	2026-02-17 22:31:59.016	16.455461624002000000000000000000	99.530099538210780000000000000000	-oj16l7	QR	2026-02-18 05:50:33.715	16.455117696910260000000000000000	99.530087951663450000000000000000	-oj16l7	GPS	APPROVED	6.300000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 22:39:08.685	2026-02-17 22:31:59.66	2026-02-18 05:50:34.589	\N	\N	0.000000000000000000000000000000	\N
cml7oym2d0001y9t0rgpth24g	cml5w8h240001ugxaadqh8irg	2026-02-04 00:00:00	2026-02-04 07:13:47.665	16.475127700000000000000000000000	99.553692000000000000000000000000	-zcd007	QR	2026-02-04 07:25:36.906	16.475145300000000000000000000000	99.553667600000000000000000000000	-zcd007	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 07:13:48.086	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cmlvtsq0d000d9q91219ulp5s	cml6ctuzt0005uqrgdnihhrcg	2026-01-30 17:00:00	2026-01-30 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 11:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:39.565	2026-02-21 04:35:39.565	\N	\N	0.000000000000000000000000000000	\N
cml7r2j5k00036ar2jkuyfxkh	cml61rz7u000111dofdoy94sd	2026-02-04 00:00:00	2026-02-04 08:12:49.318	16.475143520782650000000000000000	99.553472963581090000000000000000	-a7615o	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 08:12:50.168	2026-02-06 00:29:48.366	0	2026-02-04 15:13:23.134	0.000000000000000000000000000000	2026-02-04 15:13:01.886
cml7qyhsg0001giug1dh096on	cml5g1xzx001oua47iy5u23oh	2026-02-04 00:00:00	2026-02-04 08:09:41.336	16.475148500000000000000000000000	99.553703300000000000000000000000	g3up74	QR	2026-02-04 08:13:39.537	16.475169400000000000000000000000	99.553648999999990000000000000000	g3up74	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 08:09:41.776	2026-02-06 00:29:48.366	0	2026-02-04 15:10:34.736	0.000000000000000000000000000000	2026-02-04 15:10:27.823
cml7tv9xu0001gwigzxbqbn7h	cml6ctv6r000huqrg08xd4xcm	2026-02-04 00:00:00	2026-02-04 09:31:10.054	16.436232061647480000000000000000	99.511738772574720000000000000000	-bj8nbo	QR	2026-02-04 09:31:34.412	16.436263778488670000000000000000	99.511648674467950000000000000000	-bj8nbo	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 09:31:10.482	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cmlebj1e10005p92ol0kklvnm	cml6ctvwy001xuqrgl2hwd8y1	2026-02-08 17:00:00	2026-02-08 22:32:09.029	16.475224300000000000000000000000	99.553668900000010000000000000000	-wfhbzg	GPS	2026-02-09 10:32:18.18	16.475160200000000000000000000000	99.553657800000000000000000000000	-wfhbzg	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	2	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 22:32:09.673	2026-02-09 10:32:19.449	86	2026-02-09 04:27:41.44	0.000000000000000000000000000000	2026-02-09 03:01:27.826
cmlegfbsk0001utfr8qnfxd5k	cml6ctvp6001fuqrgjo0cut8g	2026-02-08 17:00:00	2026-02-09 00:49:14.189	16.455107500000000000000000000000	99.530118200000000000000000000000	-ilt8ll	QR	2026-02-09 10:01:29.277	16.454948000000000000000000000000	99.530498499999990000000000000000	g2yb0x	GPS	APPROVED	8.199999999999999000000000000000	0.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 00:49:14.612	2026-02-10 00:06:39.342	\N	\N	0.000000000000000000000000000000	\N
cmla13d150001gksshlawu72f	cml5g1tky000wua47qqpf53wn	2026-02-05 17:00:00	2026-02-05 22:28:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 04:34:18.673	2026-02-05 22:28:57.401	2026-02-06 10:31:34.908	89	2026-02-06 11:34:00	0.000000000000000000000000000000	2026-02-06 10:05:00
cml7p8odd000714lz2l6786ey	cml5g20im0022ua4780xu5bou	2026-02-04 00:00:00	2026-02-04 07:21:36.77	16.475179300000000000000000000000	99.553658700000000000000000000000	-8s2lny	QR	2026-02-04 13:53:28.499	16.475200500000000000000000000000	99.553696100000000000000000000000	-nselrn	GPS	APPROVED	5.520000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 07:21:37.634	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml7pjenl0003y9t0xszkg4g4	cml5g22hz002gua47temxhj1t	2026-02-04 00:00:00	2026-02-04 07:29:57.418	16.475159100000000000000000000000	99.553715100000010000000000000000	ccsx7a	QR	2026-02-04 13:56:27.502	16.475189500000000000000000000000	99.553685800000000000000000000000	ccsx7a	GPS	APPROVED	5.430000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 07:29:58.257	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml8ra2y40003c54baixehgk3	cml6ctv0x0007uqrgprf5lu7c	2026-02-05 00:00:00	2026-02-05 01:06:28.125	16.436331228738230000000000000000	99.511794751069730000000000000000	-85vz5c	QR	2026-02-05 01:20:45.778	16.436330861567090000000000000000	99.511795017494960000000000000000	-85vz5c	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 01:06:28.589	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml9abacb0001s3rojblecsaq	cml6cv8qd000113l7pz55vip3	2026-02-05 00:00:00	2026-02-05 09:59:17.099	16.455099600000000000000000000000	99.530175600000010000000000000000	-xgf12i	QR	2026-02-05 10:43:32.825	16.455097500000000000000000000000	99.530105100000000000000000000000	-xgf12i	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 09:59:17.532	2026-02-06 00:29:48.366	0	2026-02-05 17:12:55.233	0.000000000000000000000000000000	2026-02-05 17:12:26.028
cml8td5k90001hxyxnf22uwj1	cml5g1tky000wua47qqpf53wn	2026-02-05 00:00:00	2026-02-05 02:04:50.747	16.475221400000000000000000000000	99.553568700000000000000000000000	-zcd007	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 02:04:51.177	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml8rab060005c54bv02ijg0x	cml6ctuyp0003uqrgejbtvcmm	2026-02-05 00:00:00	2026-02-05 01:06:38.566	16.436299600000000000000000000000	99.511771300000010000000000000000	-w9hfrz	QR	2026-02-05 12:27:17.721	16.436321000000000000000000000000	99.511777400000000000000000000000	-w9hfrz	GPS	APPROVED	10.330000000000000000000000000000	2.330000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 01:06:39.03	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml8nco550003e6xeczyd0egh	cml6ctuzt0005uqrgdnihhrcg	2026-02-05 00:00:00	2026-02-04 23:16:30.48	16.436392200000000000000000000000	99.511856600000000000000000000000	-tvo3gw	QR	2026-02-05 11:18:30.654	16.436298700000000000000000000000	99.512003900000000000000000000000	-tvo3gw	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 23:16:30.906	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml8neh8s0001btttlp7ttkh9	cml6ctv6r000huqrg08xd4xcm	2026-02-05 00:00:00	2026-02-04 23:17:54.845	16.436300658453650000000000000000	99.511868390772610000000000000000	-bj8nbo	QR	2026-02-05 06:00:57.791	16.436302092045820000000000000000	99.511862517770810000000000000000	579pd4	GPS	APPROVED	5.720000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 23:17:55.276	2026-02-06 00:29:48.366	1	2026-02-05 12:39:36.84	0.000000000000000000000000000000	2026-02-05 12:38:26.002
cmla25enp0007h32hczlxxu8n	cml6ctv3c000buqrguslcci85	2026-02-05 17:00:00	2026-02-05 22:58:31.984	16.436390892200210000000000000000	99.511849814560880000000000000000	gg44cx	QR	2026-02-06 11:05:00	16.436389445697430000000000000000	99.511450870792120000000000000000	gg44cx	MANUAL	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-05 22:58:32.437	2026-02-21 03:17:11.682	66	2026-02-06 11:10:12.395	0.000000000000000000000000000000	2026-02-06 10:04:10.871
cml8tvs8200015zp1hk89boqt	cml5waf57000114p7u4pb0j1l	2026-02-05 00:00:00	2026-02-05 02:19:19.924	16.475184300000000000000000000000	99.553761499999990000000000000000	4uyosu	QR	2026-02-05 09:35:20.983	16.475463700000000000000000000000	99.553843099999990000000000000000	4uyosu	GPS	APPROVED	6.270000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 02:19:20.354	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml8tw9l900035zp1rrbb06sq	cml6ctvsk001nuqrgooayfxde	2026-02-05 00:00:00	2026-02-05 02:19:42.435	16.475175300000000000000000000000	99.553637800000000000000000000000	-xk7lgp	QR	2026-02-05 10:00:27.346	16.475174300000000000000000000000	99.553633700000010000000000000000	-f38l64	GPS	APPROVED	6.670000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 02:19:42.862	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml8yjb110001oz5ctlw6tf9w	cml6ctvrh001luqrg60imh1k9	2026-02-05 00:00:00	2026-02-05 04:29:35.399	16.475151700000000000000000000000	99.553636800000010000000000000000	-tvo3gw	QR	2026-02-05 10:56:31.702	16.475171500000000000000000000000	99.553625600000000000000000000000	-tvo3gw	GPS	APPROVED	5.430000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 04:29:36.278	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml8mpnck0003tv75rw9hgp63	cml5g1qzg000iua472zcpgugd	2026-02-05 00:00:00	2026-02-04 22:58:36.357	16.475174200000000000000000000000	99.553633600000000000000000000000	-8s2lny	QR	2026-02-05 11:00:12.183	16.475101200000000000000000000000	99.553091499999990000000000000000	-8s2lny	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 22:58:36.789	2026-02-06 00:29:48.366	87	2026-02-05 12:58:05.078	0.000000000000000000000000000000	2026-02-05 11:30:44.21
cml8njl870001qxuypceze1ce	cml5g1xzx001oua47iy5u23oh	2026-02-05 00:00:00	2026-02-04 23:21:53.044	16.475176200000000000000000000000	99.553661000000010000000000000000	g3up74	QR	2026-02-05 11:31:10.936	16.475188200000000000000000000000	99.553636400000000000000000000000	g3up74	GPS	APPROVED	11.150000000000000000000000000000	3.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 23:21:53.719	2026-02-06 00:29:48.366	86	2026-02-05 11:57:19.545	0.000000000000000000000000000000	2026-02-05 10:30:35.136
cml8pyqm10001c54bxosml4xq	cml5g1vmh001aua47rlxc2pr1	2026-02-05 00:00:00	2026-02-05 00:29:39.316	16.475250000000000000000000000000	99.553861900000000000000000000000	2hlpr1	QR	2026-02-05 12:31:12.938	16.475144400000000000000000000000	99.553714799999990000000000000000	2hlpr1	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 00:29:39.769	2026-02-06 00:29:48.366	13	2026-02-05 12:14:19.937	0.000000000000000000000000000000	2026-02-05 12:00:26.315
cml8mrazd0005tv75pwywj57g	cml5w8h240001ugxaadqh8irg	2026-02-05 00:00:00	2026-02-04 22:59:53.654	16.475091900000000000000000000000	99.553708599999990000000000000000	-zcd007	QR	2026-02-05 10:34:49.011	16.475258700000000000000000000000	99.553651200000000000000000000000	-zcd007	GPS	APPROVED	10.570000000000000000000000000000	2.570000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 22:59:54.074	2026-02-06 00:29:48.366	0	2026-02-05 06:08:31.044	0.000000000000000000000000000000	2026-02-05 06:07:53.144
cml9bqujf00015n4xzadmb7fx	cml6ctvz80021uqrghd4qf3t2	2026-02-05 00:00:00	2026-02-05 10:39:22.742	16.475173900000000000000000000000	99.553636000000000000000000000000	-trvj2p	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 10:39:23.164	2026-02-06 00:29:48.366	\N	\N	0.000000000000000000000000000000	\N
cml92xdml00011powkknc76yr	cml6ctveb000vuqrg3ulgugaj	2026-02-05 00:00:00	2026-02-05 06:32:30.863	16.455078900000000000000000000000	99.530120000000000000000000000000	-c3lq7g	QR	2026-02-05 18:32:30.863	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 06:32:31.293	2026-02-18 22:34:45.854	0	2026-02-05 13:35:28.13	0.000000000000000000000000000000	2026-02-05 13:35:03.703
cml93luip00076dc9l2tcn15j	cml6ctvja0013uqrgbdjr4l0e	2026-02-05 00:00:00	2026-02-05 06:51:32.497	16.455116400000000000000000000000	99.530144300000000000000000000000	-xk7lgp	QR	2026-02-13 23:03:11.671	16.455016100000000000000000000000	99.530167100000000000000000000000	-cvmrg6	GPS	APPROVED	207.180000000000000000000000000000	199.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 06:51:32.929	2026-02-13 23:03:12.104	0	2026-02-05 13:52:11.21	0.000000000000000000000000000000	2026-02-05 13:51:54.352
cml8u8zky0001ugwtw2th6gkc	cml6ctvtp001puqrgr6j1clm9	2026-02-05 00:00:00	2026-02-05 02:29:35.985	16.475170600000000000000000000000	99.553652400000000000000000000000	4zl33m	QR	2026-02-14 09:56:15.941	16.475521300000000000000000000000	99.553798000000000000000000000000	4zl33m	GPS	APPROVED	222.430000000000000000000000000000	214.430000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 02:29:36.418	2026-02-14 09:56:16.374	\N	\N	0.000000000000000000000000000000	\N
cml7qudnx00016ar2amb61nz0	cml5g1vmh001aua47rlxc2pr1	2026-02-04 00:00:00	2026-02-04 15:06:00	16.475166600000000000000000000000	99.553685500000000000000000000000	2hlpr1	ADMIN_EDIT	2026-02-14 23:32:50.897	16.475252000000000000000000000000	99.553567300000000000000000000000	2hlpr1	GPS	APPROVED	247.430000000000000000000000000000	239.430000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 08:06:29.805	2026-02-14 23:32:51.524	\N	\N	0.000000000000000000000000000000	\N
cml8tg04t0001z9dq3ye4d36l	cml5g289u003uua47ulssk26x	2026-02-05 00:00:00	2026-02-05 02:07:03.688	16.475149400000000000000000000000	99.553598800000000000000000000000	ktr8uu	QR	2026-02-15 01:06:07.332	16.475276400000000000000000000000	99.553552300000010000000000000000	ktr8uu	GPS	APPROVED	237.980000000000000000000000000000	229.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 02:07:04.109	2026-02-15 01:06:09.889	91	2026-02-05 13:31:38.258	0.000000000000000000000000000000	2026-02-05 12:00:32.901
cmln9669c0003oqwiq6r8zli7	cmlm76c5y0001vdciu64hkooq	2026-02-15 00:00:00	2026-02-14 23:30:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-15 04:36:05.809	2026-02-15 04:36:05.809	\N	\N	0.000000000000000000000000000000	\N
cml916hz800016dc9wtsfu4bp	cml5cxygj0003v68ql9533bl3	2026-02-05 00:00:00	2026-02-05 05:43:37.18	16.475162300000000000000000000000	99.553630799999990000000000000000	-wfhbzg	QR	2026-02-15 05:41:36.403	16.475175800000000000000000000000	99.553631800000010000000000000000	-wfhbzg	GPS	APPROVED	238.950000000000000000000000000000	230.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 05:43:37.605	2026-02-15 05:41:37.266	\N	\N	0.000000000000000000000000000000	\N
cmlvwqta0000b12vpfitmocz1	cml6ctv6r000huqrg08xd4xcm	2026-01-31 17:00:00	2026-01-31 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 06:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	6.250000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:58:09.336	2026-02-21 05:59:54.832	\N	\N	0.000000000000000000000000000000	\N
cml9da86g0001dun82wg14btw	cml6ctv4g000duqrgdybgtyte	2026-02-05 00:00:00	2026-02-05 11:22:26.244	16.436285300000000000000000000000	99.511939799999990000000000000000	-8y1m2y	GPS	\N	\N	\N	\N	\N	APPROVED	\N	\N	22	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 11:22:26.92	2026-02-06 00:29:48.366	20	2026-02-05 19:01:21.719	0.000000000000000000000000000000	2026-02-05 18:40:58.599
cmla9uyzx0001nr5j3hhg7o3i	cml6cv8qd000113l7pz55vip3	2026-02-06 00:00:00	2026-02-06 00:00:00	\N	\N	\N	MANUAL	2026-02-06 12:00:00	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.)	\N	\N	2026-02-06 02:34:22.509	2026-02-16 23:53:34.614	\N	\N	0.000000000000000000000000000000	\N
cmla16m1j000378vd3d8szvv6	cml6ctvwy001xuqrgl2hwd8y1	2026-02-05 17:00:00	2026-02-05 22:31:28.402	16.475145100000000000000000000000	99.553647299999990000000000000000	-wfhbzg	QR	2026-02-06 14:00:00	16.475205700000000000000000000000	99.553665600000000000000000000000	-wfhbzg	ADMIN_EDIT	APPROVED	15.475443888888890000000000000000	3.020000000000000000000000000000	1	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-05 22:31:29.047	2026-02-21 03:23:50.901	363	2026-02-06 10:33:33.653	28.916666666666670000000000000000	2026-02-06 04:30:00.272
cmlusi5ru0001hgzfopsmfeaq	cml6ctv5n000fuqrg94t826wg	2026-02-19 17:00:00	2026-02-20 11:11:40.562	16.436309600000000000000000000000	99.512036400000000000000000000000	-ifqw5k	QR	2026-02-20 23:10:05.111	16.436210600000000000000000000000	99.512076400000000000000000000000	-ifqw5k	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 11:11:40.986	2026-02-21 00:51:17.252	\N	\N	0.000000000000000000000000000000	\N
cmlvtsq7y000f9q914xzfvqrz	cml6ctvhm0011uqrgd2s6gv12	2026-01-27 17:00:00	2026-01-28 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:39.839	2026-02-21 04:35:39.839	\N	\N	0.000000000000000000000000000000	\N
cmlec7wst000114l9m0yrps0c	cml6ctvnx001buqrgfzjexn6r	2026-02-08 17:00:00	2026-02-08 22:51:29.494	16.455091600000000000000000000000	99.530106200000010000000000000000	-3nueuy	QR	2026-02-13 22:55:43.276	16.455059100000000000000000000000	99.530131400000000000000000000000	-3nueuy	GPS	APPROVED	119.070000000000000000000000000000	111.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-08 22:52:17.524	2026-02-08 22:51:30.125	2026-02-13 22:55:43.907	\N	\N	0.000000000000000000000000000000	\N
cmlbjxpi100095szhyxzlntof	cml5g1vmh001aua47rlxc2pr1	2026-02-06 17:00:00	2026-02-07 00:04:00	16.475252300000000000000000000000	99.553691300000000000000000000000	2hlpr1	ADMIN_BACKFILL	2026-02-07 03:00:00	16.475182800000000000000000000000	99.553816400000000000000000000000	2hlpr1	ADMIN_BACKFILL	APPROVED	1.930000000000000000000000000000	0.000000000000000000000000000000	34	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-07 00:04:12.506	2026-02-22 03:33:14.42	\N	\N	0.000000000000000000000000000000	\N
cmlar7sx20001krf5gazyw1in	cml6ctvp6001fuqrgjo0cut8g	2026-02-06 00:00:00	2026-02-06 01:00:00	\N	\N	\N	MANUAL	2026-02-06 10:00:00	\N	\N	\N	MANUAL	APPROVED	8.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-06 10:40:14.63	2026-02-06 10:40:26.096	\N	\N	0.000000000000000000000000000000	\N
cmlvtsqc4000h9q910imqk93d	cml6ctuzt0005uqrgdnihhrcg	2026-01-31 17:00:00	2026-01-31 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 05:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	5.170000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:39.988	2026-02-21 04:35:39.988	\N	\N	0.000000000000000000000000000000	\N
cmlar2kwm0001mb949b3az23j	cml5g1tky000wua47qqpf53wn	2026-02-06 00:00:00	2026-02-05 22:29:00	\N	\N	\N	MANUAL	2026-02-06 10:30:00	\N	\N	\N	MANUAL	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 10:44:52.121	2026-02-06 10:36:10.966	2026-02-06 10:44:52.122	\N	\N	0.000000000000000000000000000000	\N
cmlarbnvu0003krf570d1eats	cml6ctvhm0011uqrgd2s6gv12	2026-02-06 00:00:00	2026-02-05 23:00:00	\N	\N	\N	MANUAL	2026-02-06 11:00:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-06 10:43:14.731	2026-02-06 12:18:56.322	\N	\N	0.000000000000000000000000000000	\N
cmlarcdcw0005krf56p6stmz3	cml6ctvgi000zuqrguiuyi2de	2026-02-06 00:00:00	2026-02-06 02:00:00	\N	\N	\N	MANUAL	2026-02-06 14:00:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-06 10:43:47.744	2026-02-06 13:55:58.45	\N	\N	0.000000000000000000000000000000	\N
cml93akr900056dc9zmiff3sk	cml6ctvhm0011uqrgd2s6gv12	2026-02-05 00:00:00	2026-02-05 06:42:46.634	16.455115300000000000000000000000	99.530148200000000000000000000000	g6sqmk	QR	2026-02-05 06:43:57.57	16.455106400000000000000000000000	99.530119500000000000000000000000	g6sqmk	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	cml6ctveb000vuqrg3ulgugaj	2026-02-06 13:56:58.993	2026-02-05 06:42:47.061	2026-02-06 13:56:58.994	0	2026-02-05 13:43:42.451	0.000000000000000000000000000000	2026-02-05 13:43:12.186
cmlagwma00001qhtvppokni35	cml6ctvlp0017uqrgl43h68pm	2026-02-05 17:00:00	2026-02-06 05:51:36.212	16.455097000000000000000000000000	99.530099800000000000000000000000	-jkouny	QR	2026-02-06 14:00:54.129	16.455101700000000000000000000000	99.530099699999990000000000000000	-jkouny	GPS	APPROVED	7.150000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 13:56:22.17	2026-02-06 05:51:36.649	2026-02-06 14:00:54.571	\N	\N	0.000000000000000000000000000000	\N
cmlvtsqkb000j9q910u2w6duj	cml6ctvhm0011uqrgd2s6gv12	2026-01-28 17:00:00	2026-01-29 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:40.283	2026-02-21 04:35:40.283	\N	\N	0.000000000000000000000000000000	\N
cmlbk3rrd000d5szh9jxyn4zd	cml5waf57000114p7u4pb0j1l	2026-02-06 17:00:00	2026-02-07 00:08:54.689	16.475185600000000000000000000000	99.553643200000000000000000000000	4uyosu	GPS	2026-02-14 09:56:09.982	16.475511800000000000000000000000	99.553810400000000000000000000000	vr2ul	GPS	APPROVED	176.780000000000000000000000000000	168.780000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 00:08:55.369	2026-02-14 09:56:10.631	\N	\N	0.000000000000000000000000000000	\N
cmla5gf0r000h4e16h7ujhptj	cml6ctuyp0003uqrgejbtvcmm	2026-02-05 17:00:00	2026-02-06 00:31:04.522	16.436562000000000000000000000000	99.512032500000000000000000000000	-w9hfrz	QR	2026-02-14 12:32:50.436	16.436301800000000000000000000000	99.512019000000000000000000000000	-w9hfrz	GPS	APPROVED	203.020000000000000000000000000000	195.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 00:31:04.971	2026-02-14 12:32:50.859	\N	\N	0.000000000000000000000000000000	\N
cmlagykjp00016w4662cz8eea	cml6ctv7w000juqrgh1tdiejn	2026-02-05 17:00:00	2026-02-06 05:53:07.27	16.436274500000000000000000000000	99.512032700000010000000000000000	rcqple	QR	2026-02-06 15:15:25.105	16.436534800000000000000000000000	99.511700200000010000000000000000	rcqple	GPS	APPROVED	8.369999999999999000000000000000	0.370000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 05:53:07.717	2026-02-07 00:05:30.441	496	2026-02-06 14:10:21.541	0.000000000000000000000000000000	2026-02-06 05:54:16.981
cmlbjtoh500075szh8fivzj9u	cml6ctvsk001nuqrgooayfxde	2026-02-06 17:00:00	2026-02-07 00:01:03.87	16.475248500000000000000000000000	99.553746600000000000000000000000	-xk7lgp	QR	2026-02-14 23:59:35.774	16.475214600000000000000000000000	99.553706899999990000000000000000	-xk7lgp	GPS	APPROVED	190.970000000000000000000000000000	182.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-07 00:01:04.552	2026-02-14 23:59:36.653	\N	\N	0.000000000000000000000000000000	\N
cmlbhnnml0007uzl7zyzitkzy	cml6ctuzt0005uqrgdnihhrcg	2026-02-06 17:00:00	2026-02-06 23:00:23.099	16.436580000000000000000000000000	99.511754999999990000000000000000	-tvo3gw	QR	2026-02-07 11:02:22.604	16.436410000000000000000000000000	99.511755600000000000000000000000	-tvo3gw	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 23:00:24.285	2026-02-07 11:02:23.042	52	2026-02-07 06:01:52.915	0.000000000000000000000000000000	2026-02-07 05:09:06.934
cmlbhopbp0009uzl7gpu1s323	cml5w8h240001ugxaadqh8irg	2026-02-06 17:00:00	2026-02-06 23:01:12.683	16.475208400000000000000000000000	99.553782900000000000000000000000	-zcd007	QR	2026-02-07 05:35:50.779	16.475238100000000000000000000000	99.553602700000000000000000000000	-zcd007	GPS	APPROVED	5.570000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 23:01:13.142	2026-02-07 05:35:51.2	\N	\N	0.000000000000000000000000000000	\N
cmlbglvir0001uzl7i4pjrn70	cml6ctvcw000tuqrgj8clzpzz	2026-02-06 17:00:00	2026-02-06 22:31:01.136	16.455139825135890000000000000000	99.530027015227390000000000000000	-oj16l7	QR	2026-02-07 14:24:38.477	16.455091796829460000000000000000	99.530173949990000000000000000000	-oj16l7	GPS	APPROVED	14.880000000000000000000000000000	6.880000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 22:31:01.588	2026-02-07 14:24:38.918	\N	\N	0.000000000000000000000000000000	\N
cmla5hdu6000112l4m9r5052c	cml6ctva5000nuqrg8wh05sro	2026-02-05 17:00:00	2026-02-06 00:31:49.64	16.436192000000000000000000000000	99.512136299999990000000000000000	-68ibx1	QR	2026-02-16 00:27:47.215	16.436224500000000000000000000000	99.512225099999990000000000000000	4zl33m	GPS	APPROVED	238.920000000000000000000000000000	230.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 00:31:50.094	2026-02-16 00:27:47.64	\N	\N	0.000000000000000000000000000000	\N
cmlbhjgc000035szhyyf4byis	cml5g1xzx001oua47iy5u23oh	2026-02-06 17:00:00	2026-02-06 22:57:07.54	16.475418000000000000000000000000	99.553444600000010000000000000000	g3up74	QR	2026-02-07 11:00:48.913	16.475167300000000000000000000000	99.553655300000000000000000000000	g3up74	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 22:57:08.208	2026-02-07 11:00:49.567	\N	\N	0.000000000000000000000000000000	\N
cml9fkkdm00021xs1nhhvt5x6	cml6ctva5000nuqrg8wh05sro	2026-02-05 00:00:00	2026-02-05 12:26:28.077	16.436348300000000000000000000000	99.511917400000000000000000000000	-68ibx1	QR	2026-02-16 00:28:07.795	16.436215100000000000000000000000	99.512206000000010000000000000000	4zl33m	GPS	APPROVED	251.020000000000000000000000000000	243.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 12:26:28.522	2026-02-16 00:28:08.43	\N	\N	0.000000000000000000000000000000	\N
cmlbk10ko000b5szhq1geemkj	cml6ctvtp001puqrgr6j1clm9	2026-02-06 17:00:00	2026-02-07 00:06:46.375	16.475366400000000000000000000000	99.553806900000000000000000000000	4zl33m	QR	2026-02-07 09:57:14.671	16.475163200000000000000000000000	99.553730300000000000000000000000	4zl33m	GPS	APPROVED	8.830000000000000000000000000000	0.830000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 00:06:46.824	2026-02-08 00:29:51.279	\N	\N	0.000000000000000000000000000000	\N
cmlbk4npq000juzl7l6vq74uz	cml6ctv0x0007uqrgprf5lu7c	2026-02-06 17:00:00	2026-02-07 00:09:36.115	16.436342341254010000000000000000	99.511802203742690000000000000000	-85vz5c	QR	2026-02-07 12:07:11.41	16.436378461471400000000000000000	99.511794016191130000000000000000	-85vz5c	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 00:09:36.782	2026-02-08 00:29:51.279	62	2026-02-07 07:05:23.446	0.000000000000000000000000000000	2026-02-07 06:02:45.882
cmla24yka0005h32hu34xmnm9	cml5g1qzg000iua472zcpgugd	2026-02-05 17:00:00	2026-02-05 22:58:10.921	16.475213400000000000000000000000	99.553609100000000000000000000000	-8s2lny	QR	2026-02-06 11:01:04.442	16.475166400000000000000000000000	99.553632300000000000000000000000	-8s2lny	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-05 22:58:11.578	2026-02-07 00:05:30.441	423	2026-02-06 11:33:55.986	28.916666666666670000000000000000	2026-02-06 04:29:57.387
cmla1zwu60001h32hq54660zi	cml6ctuzt0005uqrgdnihhrcg	2026-02-05 17:00:00	2026-02-05 22:54:15.631	16.436201000000000000000000000000	99.512082400000000000000000000000	-tvo3gw	QR	2026-02-06 11:02:33.554	16.436388100000000000000000000000	99.511877900000000000000000000000	-tvo3gw	GPS	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-05 22:54:16.062	2026-02-07 00:05:30.441	526	2026-02-06 12:48:02.787	26.666666666666670000000000000000	2026-02-06 04:01:55.35
cmlu3gpxm000339rcq9sjj5qo	cml5g22hz002gua47temxhj1t	2026-02-19 17:00:00	2026-02-19 23:30:00	\N	\N	\N	MANUAL	2026-02-20 11:31:12.592	16.475174300000000000000000000000	99.553629300000000000000000000000	8dlb91	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-19 23:30:43.402	2026-02-20 11:31:15.23	80	2026-02-20 04:26:34.721	0.000000000000000000000000000000	2026-02-20 03:06:05.588
cmla2ibwj00034e16jue1l1p6	cml6ctv6r000huqrg08xd4xcm	2026-02-05 17:00:00	2026-02-05 23:08:34.945	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	QR	2026-02-06 06:48:04.711	16.436303386830370000000000000000	99.511863424054880000000000000000	579pd4	GPS	APPROVED	6.650000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-05 23:08:35.395	2026-02-07 00:05:30.441	424	2026-02-06 11:10:29.921	0.000000000000000000000000000000	2026-02-06 04:06:24.327
cmla4jmp3000310xwk93b21bm	cml5waf57000114p7u4pb0j1l	2026-02-05 17:00:00	2026-02-06 00:05:34.816	16.475183200000000000000000000000	99.553593199999990000000000000000	4uyosu	QR	2026-02-06 09:55:04.978	16.475192700000000000000000000000	99.553707700000000000000000000000	4uyosu	GPS	APPROVED	8.820000000000000000000000000000	0.820000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 00:05:35.272	2026-02-07 00:05:30.441	\N	\N	0.000000000000000000000000000000	\N
cmla8hi5900032dpdfdlxs09u	cml5g20im0022ua4780xu5bou	2026-02-05 17:00:00	2026-02-06 01:55:53.889	16.475168300000000000000000000000	99.553773300000000000000000000000	-nselrn	QR	2026-02-06 13:56:53.937	16.475189700000000000000000000000	99.553672100000000000000000000000	-nselrn	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 01:55:54.525	2026-02-07 00:05:30.441	88	2026-02-06 06:59:47.047	0.000000000000000000000000000000	2026-02-06 05:31:15.971
cmla4ik7t000110xwidu0f83h	cml6ctvsk001nuqrgooayfxde	2026-02-05 17:00:00	2026-02-06 00:04:44.968	16.475236800000000000000000000000	99.553732400000000000000000000000	-xk7lgp	QR	2026-02-06 09:55:36.793	16.475176200000000000000000000000	99.553640300000000000000000000000	-xk7lgp	GPS	APPROVED	8.830000000000000000000000000000	0.830000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 00:04:45.401	2026-02-07 00:05:30.441	\N	\N	0.000000000000000000000000000000	\N
cmla4kuo5000b4e16o2ehvblj	cml6ctvtp001puqrgr6j1clm9	2026-02-05 17:00:00	2026-02-06 00:06:31.841	16.475256400000000000000000000000	99.553753900000000000000000000000	4zl33m	QR	2026-02-06 09:56:14.001	16.475118400000000000000000000000	99.553631499999990000000000000000	4zl33m	GPS	APPROVED	8.820000000000000000000000000000	0.820000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 00:06:32.261	2026-02-07 00:05:30.441	\N	\N	0.000000000000000000000000000000	\N
cmla5dwwd000f4e164z1yto7w	cml6ctvrh001luqrg60imh1k9	2026-02-05 17:00:00	2026-02-06 00:29:07.726	16.475172200000000000000000000000	99.553642400000000000000000000000	-tvo3gw	QR	2026-02-06 10:04:03.996	16.475173100000000000000000000000	99.553638900000000000000000000000	-tvo3gw	GPS	APPROVED	8.570000000000000000000000000000	0.570000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 00:29:08.174	2026-02-07 00:05:30.441	\N	\N	0.000000000000000000000000000000	\N
cmlaqsco60001u5loz39knvus	cml6ctvz80021uqrghd4qf3t2	2026-02-05 17:00:00	2026-02-06 10:28:13.308	16.475214100000000000000000000000	99.553655400000000000000000000000	-trvj2p	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 10:28:13.734	2026-02-07 00:05:30.441	\N	\N	0.000000000000000000000000000000	\N
cmla2l1lr00054e16yl31w9bx	cml6ctv4g000duqrgdybgtyte	2026-02-05 17:00:00	2026-02-05 23:10:41.351	16.436331500000000000000000000000	99.511923700000000000000000000000	7uvltx	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-05 23:10:42.016	2026-02-07 00:05:30.441	\N	\N	0.000000000000000000000000000000	\N
cmlvtsqnv000l9q911vd7mf0z	cml6ctuzt0005uqrgdnihhrcg	2026-02-01 17:00:00	2026-02-01 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:40.411	2026-02-21 04:35:40.411	\N	\N	0.000000000000000000000000000000	\N
cmlps5vzz0005wxziwueygmkf	cml5w8h240001ugxaadqh8irg	2026-02-16 17:00:00	2026-02-16 23:03:16.293	16.475190000000000000000000000000	99.553658000000000000000000000000	vpjg0o	QR	2026-02-17 05:57:51.793	16.475187500000000000000000000000	99.553539700000000000000000000000	vpjg0o	GPS	APPROVED	5.900000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:03:17.567	2026-02-17 05:57:52.446	\N	\N	0.000000000000000000000000000000	\N
cmlcw40z90005uksuqwk6m09l	cml5g1tky000wua47qqpf53wn	2026-02-08 00:00:00	2026-02-07 22:32:00	\N	\N	\N	MANUAL	2026-02-08 10:31:00	\N	\N	\N	MANUAL	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-08 03:01:47.506	2026-02-07 22:32:48.885	2026-02-08 11:03:14.336	\N	\N	0.000000000000000000000000000000	\N
cmlfy3eo7000112vartc0pu06	cml5g20im0022ua4780xu5bou	2026-02-09 17:00:00	2026-02-10 01:51:37.051	16.475230300000000000000000000000	99.553541400000000000000000000000	-nselrn	GPS	2026-02-10 13:56:39.063	16.474950600000000000000000000000	99.553525300000000000000000000000	-nselrn	GPS	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 01:51:37.736	2026-02-11 00:23:23.321	0	2026-02-10 01:52:12.827	0.000000000000000000000000000000	2026-02-10 01:51:43.095
cmlecaiiw0001kwp483271jiw	cml6ctveb000vuqrg3ulgugaj	2026-02-08 00:00:00	2026-02-08 05:54:00	\N	\N	\N	MANUAL	2026-02-08 14:01:00	\N	\N	\N	MANUAL	APPROVED	7.120000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-08 22:53:31.592	2026-02-08 22:53:47.315	\N	\N	0.000000000000000000000000000000	\N
cmlful2ul0003panjws7w8ctv	cml6ctv0x0007uqrgprf5lu7c	2026-02-09 17:00:00	2026-02-10 00:13:23.304	16.435983663636010000000000000000	99.511927633582970000000000000000	-85vz5c	QR	2026-02-10 12:04:30.495	16.436391148321960000000000000000	99.511781222176480000000000000000	-85vz5c	GPS	APPROVED	10.850000000000000000000000000000	2.850000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 00:13:23.757	2026-02-11 00:23:23.321	56	2026-02-10 06:10:28.184	0.000000000000000000000000000000	2026-02-10 05:13:33.431
cmlkgyog80001x1dyis5ar9al	cml6ctvlp0017uqrgl43h68pm	2026-02-12 17:00:00	2026-02-13 05:50:54.093	16.455100300000000000000000000000	99.530092300000010000000000000000	-jkouny	QR	2026-02-13 14:01:57.841	16.454934100000000000000000000000	99.530190400000000000000000000000	-jkouny	GPS	APPROVED	7.180000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-13 13:58:57.716	2026-02-13 05:50:54.536	2026-02-13 14:01:58.27	\N	\N	0.000000000000000000000000000000	\N
cmlbhghis00015szhpo62kzrk	cml6ctvnx001buqrgfzjexn6r	2026-02-06 17:00:00	2026-02-06 22:54:49.12	16.455099700000000000000000000000	99.530091900000000000000000000000	-3nueuy	QR	2026-02-07 12:14:20.154	16.455026800000000000000000000000	99.529766700000000000000000000000	-3nueuy	GPS	APPROVED	12.320000000000000000000000000000	4.320000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 22:54:49.781	2026-02-07 12:14:21.444	\N	\N	0.000000000000000000000000000000	\N
cmlbhtvat000buzl7e0fy0ejn	cml6ctvhm0011uqrgd2s6gv12	2026-02-06 17:00:00	2026-02-06 23:05:13.732	16.455104900000000000000000000000	99.530168200000010000000000000000	g6sqmk	QR	2026-02-07 11:01:34.379	16.455077100000000000000000000000	99.530135400000010000000000000000	qvxl8t	GPS	APPROVED	10.930000000000000000000000000000	2.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	cml6ctvcw000tuqrgj8clzpzz	2026-02-07 06:00:06.405	2026-02-06 23:05:14.165	2026-02-07 11:01:34.817	90	2026-02-07 05:59:42.956	0.000000000000000000000000000000	2026-02-07 04:29:16.334
cmledapwq0001ybhsavwf8sjq	cml6cv8uy000713l7zocqn0fn	2026-02-08 17:00:00	2026-02-08 23:21:40.095	16.474976200000000000000000000000	99.553204600000000000000000000000	-trvj2p	QR	2026-02-14 10:04:15.178	16.475191800000000000000000000000	99.553651400000010000000000000000	-trvj2p	GPS	APPROVED	129.700000000000000000000000000000	121.700000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:21:40.778	2026-02-14 10:04:15.817	\N	\N	0.000000000000000000000000000000	\N
cmlag8uab0001ti11qmc58o9t	cml5cxygj0003v68ql9533bl3	2026-02-05 17:00:00	2026-02-06 05:33:06.81	16.475166100000000000000000000000	99.553645600000000000000000000000	-wfhbzg	QR	2026-02-15 05:41:25.89	16.475179800000000000000000000000	99.553624300000000000000000000000	-wfhbzg	GPS	APPROVED	215.130000000000000000000000000000	207.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 05:33:07.283	2026-02-15 05:41:26.328	\N	\N	0.000000000000000000000000000000	\N
cmlecbl8a0003kwp4fc8zijsn	cml6ctveb000vuqrg3ulgugaj	2026-02-09 00:00:00	2026-02-08 22:33:00	\N	\N	\N	MANUAL	2026-02-09 05:57:00	\N	\N	\N	MANUAL	APPROVED	6.400000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-08 22:54:21.754	2026-02-09 17:23:29.418	\N	\N	0.000000000000000000000000000000	\N
cmlecos7s000b14l9kzrnni3f	cml6ctv6r000huqrg08xd4xcm	2026-02-08 17:00:00	2026-02-08 23:04:36.903	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	QR	2026-02-09 06:27:23.631	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	GPS	APPROVED	6.370000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:04:37.337	2026-02-09 06:27:24.047	\N	\N	0.000000000000000000000000000000	\N
cmlebdg2z0001p92osxegq5kl	cml6ctvkk0015uqrg9iuy6dh1	2026-02-08 17:00:00	2026-02-08 22:27:48.322	16.454950474876410000000000000000	99.530240708105860000000000000000	phfpd5	QR	2026-02-09 06:43:06.965	16.455322130208610000000000000000	99.530150579876920000000000000000	phfpd5	GPS	APPROVED	7.250000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-08 22:52:31.762	2026-02-08 22:27:48.779	2026-02-09 06:43:07.401	\N	\N	0.000000000000000000000000000000	\N
cmla28w8o0001ob7o5eptfuys	cml5w8h240001ugxaadqh8irg	2026-02-05 17:00:00	2026-02-05 23:01:14.759	16.475421600000000000000000000000	99.553762300000000000000000000000	-zcd007	QR	2026-02-15 22:58:20.814	16.475386200000000000000000000000	99.553628000000000000000000000000	vpjg0o	GPS	APPROVED	238.950000000000000000000000000000	230.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-05 23:01:15.192	2026-02-15 22:58:21.247	\N	\N	0.000000000000000000000000000000	\N
cmledizkx0003ybhsfwlllamp	cml5g1vmh001aua47rlxc2pr1	2026-02-08 17:00:00	2026-02-08 23:28:05.913	16.475143100000000000000000000000	99.553649200000000000000000000000	2hlpr1	GPS	2026-02-09 11:30:43.625	16.475290400000000000000000000000	99.553805800000010000000000000000	2hlpr1	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:28:06.561	2026-02-09 11:30:44.965	89	2026-02-09 07:29:33.451	0.000000000000000000000000000000	2026-02-09 05:59:45.504
cmlcvzjr30001uksui5vhdtru	cml6ctvkk0015uqrg9iuy6dh1	2026-02-07 17:00:00	2026-02-07 22:29:19.516	16.454812177209360000000000000000	99.530353061204420000000000000000	phfpd5	QR	2026-02-08 06:41:33.369	16.454895665157600000000000000000	99.530365407080130000000000000000	phfpd5	GPS	APPROVED	7.200000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 22:29:19.935	2026-02-08 06:41:34.253	\N	\N	0.000000000000000000000000000000	\N
cmlcx05sd0001trrgnrxuzmh6	cml5g1qzg000iua472zcpgugd	2026-02-07 17:00:00	2026-02-07 22:57:47.464	16.475161400000000000000000000000	99.553648900000000000000000000000	-8s2lny	QR	2026-02-08 05:00:53.806	16.475201000000000000000000000000	99.553629500000000000000000000000	-8s2lny	GPS	APPROVED	5.050000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 22:57:48.109	2026-02-08 05:00:54.714	\N	\N	0.000000000000000000000000000000	\N
cmlcx2wwp0001ly0jin8ruplc	cml5w8h240001ugxaadqh8irg	2026-02-07 17:00:00	2026-02-07 22:59:56.132	16.475319200000000000000000000000	99.553664600000000000000000000000	-zcd007	QR	2026-02-08 06:58:36.191	16.475206800000000000000000000000	99.553590500000000000000000000000	-zcd007	GPS	APPROVED	6.970000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 22:59:56.569	2026-02-08 06:58:37.09	\N	\N	0.000000000000000000000000000000	\N
cmlcw30gi0003uksu6cx4a5kz	cml6ctvcw000tuqrgj8clzpzz	2026-02-07 17:00:00	2026-02-07 22:32:01.13	16.455490083311330000000000000000	99.530258360305080000000000000000	-oj16l7	QR	2026-02-08 05:46:33.054	16.455125869267110000000000000000	99.529895503166630000000000000000	-oj16l7	GPS	APPROVED	6.230000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 22:32:01.554	2026-02-08 05:46:33.94	\N	\N	0.000000000000000000000000000000	\N
cmlk6jtmj000111bsvto31s9q	cml5g289u003uua47ulssk26x	2026-02-12 17:00:00	2026-02-13 00:59:24.103	16.475393900000000000000000000000	99.553422700000000000000000000000	ktr8uu	GPS	2026-02-13 13:01:38.872	16.475144900000000000000000000000	99.553633199999990000000000000000	ktr8uu	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 00:59:25.243	2026-02-14 00:24:56.285	113	2026-02-13 05:25:16.993	26.666666666666670000000000000000	2026-02-13 03:31:55.032
cmlk8r8d50005x1muyrrcpywb	cml6ctvhm0011uqrgd2s6gv12	2026-02-12 17:00:00	2026-02-13 02:01:09.438	16.455052700000000000000000000000	99.530209000000000000000000000000	4uyosu	QR	2026-02-13 13:59:36.91	16.455094700000000000000000000000	99.530156700000010000000000000000	4uyosu	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-13 02:01:32.26	2026-02-13 02:01:10.17	2026-02-13 13:59:37.552	89	2026-02-13 07:31:00.357	0.000000000000000000000000000000	2026-02-13 06:01:45.8
cmlcx38fe0003ly0jmxktrdzy	cml6ctvff000xuqrgvuiy6k2z	2026-02-08 00:00:00	2026-02-07 22:59:00	\N	\N	\N	MANUAL	2026-02-08 11:01:00	\N	\N	\N	MANUAL	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-08 06:04:18.248	2026-02-07 23:00:11.499	2026-02-08 11:02:25.8	\N	\N	0.000000000000000000000000000000	\N
cmlcx0arg0003trrgzxw2rtor	cml6ctuzt0005uqrgdnihhrcg	2026-02-07 17:00:00	2026-02-07 22:57:54.125	16.436492000000000000000000000000	99.511981100000000000000000000000	-tvo3gw	QR	2026-02-08 11:11:28.391	16.436385300000000000000000000000	99.511858000000000000000000000000	-tvo3gw	GPS	APPROVED	11.220000000000000000000000000000	3.220000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 22:57:54.556	2026-02-08 11:11:28.818	54	2026-02-08 06:09:13.232	0.000000000000000000000000000000	2026-02-08 05:14:44.032
cmlvtsqwm000n9q91ej21lmdu	cml6ctvhm0011uqrgd2s6gv12	2026-01-29 17:00:00	2026-01-30 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:40.726	2026-02-21 04:35:40.726	\N	\N	0.000000000000000000000000000000	\N
cmlcxct0g0005ly0j70dm97ij	cml6ctvnx001buqrgfzjexn6r	2026-02-07 17:00:00	2026-02-07 23:07:37.453	16.455092400000000000000000000000	99.530101200000000000000000000000	-3nueuy	GPS	2026-02-08 12:24:58.967	16.455068300000000000000000000000	99.529763200000000000000000000000	-3nueuy	GPS	APPROVED	12.280000000000000000000000000000	4.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 23:07:38.081	2026-02-08 12:24:59.604	\N	\N	0.000000000000000000000000000000	\N
cmleei8760001shde4x8d4lpz	cmlbx8f1n0001qz177uch66i0	2026-02-09 00:00:00	2026-02-08 23:55:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-08 23:55:30.69	2026-02-08 23:55:30.69	\N	\N	0.000000000000000000000000000000	\N
cmleegiz900017k8nsb29r5dx	cml6cv8ts000513l7uydg8j16	2026-02-09 00:00:00	2026-02-08 23:53:00	\N	\N	\N	MANUAL	2026-02-14 10:08:50.434	16.475227600000000000000000000000	99.553637700000000000000000000000	-p0zg9d	GPS	APPROVED	129.250000000000000000000000000000	121.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-08 23:54:11.349	2026-02-14 10:08:50.869	\N	\N	0.000000000000000000000000000000	\N
cmlbkxu1g000j5szhz6087ltr	cml6ctvrh001luqrg60imh1k9	2026-02-06 17:00:00	2026-02-07 00:32:17.374	16.475301300000000000000000000000	99.553745300000000000000000000000	-tvo3gw	QR	2026-02-07 09:59:54.999	16.475272600000000000000000000000	99.553744700000000000000000000000	-tvo3gw	GPS	APPROVED	8.449999999999999000000000000000	0.450000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 00:32:18.004	2026-02-08 00:29:51.279	\N	\N	0.000000000000000000000000000000	\N
cmlbkonkt000f5szhd60p3xm4	cml6ctvqa001huqrgn8fa8qe5	2026-02-06 17:00:00	2026-02-07 00:25:09.306	16.455168400000000000000000000000	99.530043500000000000000000000000	g3up74	QR	2026-02-07 10:01:21.399	16.455079100000000000000000000000	99.529881100000000000000000000000	g3up74	GPS	APPROVED	8.600000000000000000000000000000	0.600000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 00:25:09.725	2026-02-08 00:29:51.279	\N	\N	0.000000000000000000000000000000	\N
cmlc68y270001d5874ywc8cnt	cml6ctvz80021uqrghd4qf3t2	2026-02-06 17:00:00	2026-02-07 10:28:47.933	16.475181900000000000000000000000	99.553594000000000000000000000000	-trvj2p	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 10:28:48.367	2026-02-08 00:29:51.279	\N	\N	0.000000000000000000000000000000	\N
cmlc9ku0x0001y28gdvjsm3ns	cml6ctvb9000puqrgafxo42i7	2026-02-06 17:00:00	2026-02-07 12:02:01.432	16.436279600000000000000000000000	99.512086000000000000000000000000	-xgf12i	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 12:02:01.857	2026-02-08 00:29:51.279	\N	\N	0.000000000000000000000000000000	\N
cmlbkqrda0003u0zpzz73nhoj	cml6ctuyp0003uqrgejbtvcmm	2026-02-06 17:00:00	2026-02-07 00:26:47.521	16.436380300000000000000000000000	99.511937000000000000000000000000	-w9hfrz	QR	2026-02-07 12:37:35.157	16.436250500000000000000000000000	99.512067500000000000000000000000	-w9hfrz	GPS	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 00:26:47.95	2026-02-08 00:29:51.279	\N	\N	0.000000000000000000000000000000	\N
cmlbkskwz000h5szhts506p99	cml6ctva5000nuqrg8wh05sro	2026-02-06 17:00:00	2026-02-07 00:28:12.479	16.436323900000000000000000000000	99.511943400000010000000000000000	l62qcv	QR	2026-02-07 12:34:35.703	16.436298100000000000000000000000	99.511910099999990000000000000000	l62qcv	GPS	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 00:28:12.9	2026-02-08 00:29:51.279	\N	\N	0.000000000000000000000000000000	2026-02-07 12:34:06.553
cmlblyy360005u0zp0pg8aoog	cml5g289u003uua47ulssk26x	2026-02-06 17:00:00	2026-02-07 01:01:08.873	16.475382900000000000000000000000	99.553716100000000000000000000000	ktr8uu	GPS	2026-02-07 13:00:09.995	16.475197500000000000000000000000	99.553698700000000000000000000000	ktr8uu	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	1	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 01:01:09.522	2026-02-08 00:29:51.279	98	2026-02-07 07:40:53.756	26.666666666666670000000000000000	2026-02-07 06:02:28.343
cmlbw9s2b0001dt5mon0xq3yx	cml6ctv7w000juqrgh1tdiejn	2026-02-06 17:00:00	2026-02-07 05:49:30.668	16.436189500000000000000000000000	99.512133700000010000000000000000	rcqple	QR	2026-02-07 15:21:04.107	16.436354200000000000000000000000	99.511358200000000000000000000000	rcqple	GPS	APPROVED	8.520000000000000000000000000000	0.520000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 05:49:31.092	2026-02-08 00:29:51.279	0	2026-02-07 14:08:06.444	0.000000000000000000000000000000	2026-02-07 14:07:30.825
cmlbwdmr40003dt5mj3ioy8ys	cml6ctvlp0017uqrgl43h68pm	2026-02-06 17:00:00	2026-02-07 05:52:30.409	16.455099200000000000000000000000	99.530092600000000000000000000000	-jkouny	QR	2026-02-07 14:00:53.707	16.454781700000000000000000000000	99.530092900000000000000000000000	-jkouny	GPS	APPROVED	7.130000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 05:52:30.832	2026-02-08 00:29:51.279	\N	\N	0.000000000000000000000000000000	\N
cmlh94yiw0009f7kseo855lv7	cml6cv8sm000313l7yhueq5zy	2026-02-10 17:00:00	2026-02-10 23:48:31.638	16.455082700000000000000000000000	99.530106399999990000000000000000	-oka4kb	QR	2026-02-11 10:01:05.968	16.455058600000000000000000000000	99.530143000000000000000000000000	jl0pv7	GPS	APPROVED	9.199999999999999000000000000000	1.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:48:32.072	2026-02-11 10:01:06.401	\N	\N	0.000000000000000000000000000000	\N
cmlh980s1000bf7ksd1kozsfl	cml6cv8qd000113l7pz55vip3	2026-02-10 17:00:00	2026-02-10 23:50:54.266	16.455184700000000000000000000000	99.530238200000000000000000000000	-xgf12i	QR	2026-02-11 10:08:53.845	16.455029900000000000000000000000	99.529845400000000000000000000000	-xgf12i	GPS	APPROVED	9.279999999999999000000000000000	1.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:50:54.961	2026-02-11 10:08:54.492	\N	\N	0.000000000000000000000000000000	\N
cmlh94rbi0007f7ks65j4ekr5	cml6cv8ts000513l7uydg8j16	2026-02-10 17:00:00	2026-02-10 23:48:21.868	16.475180300000000000000000000000	99.553645300000000000000000000000	-p0zg9d	QR	2026-02-11 10:13:42.148	16.475290100000000000000000000000	99.553620400000000000000000000000	-p0zg9d	GPS	APPROVED	9.420000000000000000000000000000	1.420000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:48:22.734	2026-02-11 10:13:42.582	\N	\N	0.000000000000000000000000000000	\N
cmlvtsqzm000p9q9179qtmfs0	cml6ctuzt0005uqrgdnihhrcg	2026-02-02 17:00:00	2026-02-02 22:55:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 11:04:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.150000000000000000000000000000	3.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:40.834	2026-02-21 04:35:40.834	\N	\N	0.000000000000000000000000000000	\N
cmlvtsr8y000r9q916nxukehs	cml6ctvhm0011uqrgd2s6gv12	2026-01-30 17:00:00	2026-01-31 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:41.17	2026-02-21 04:35:41.17	\N	\N	0.000000000000000000000000000000	\N
cmlbhjzcg0005uzl7e962xr1d	cml6ctv3c000buqrguslcci85	2026-02-06 17:00:00	2026-02-06 22:57:32.381	16.436534870984390000000000000000	99.511647641619250000000000000000	gg44cx	QR	2026-02-07 15:05:00	16.436396049428840000000000000000	99.511417139034360000000000000000	gg44cx	MANUAL	APPROVED	15.120000000000000000000000000000	7.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 22:57:32.849	2026-02-21 03:17:30.52	59	2026-02-07 04:00:25.82	0.000000000000000000000000000000	2026-02-07 03:01:24.912
cmlcxw0ik00034aezlky08g70	cml6ctvwy001xuqrgl2hwd8y1	2026-02-07 17:00:00	2026-02-07 22:30:00	16.475158300000000000000000000000	99.553772400000000000000000000000	-wfhbzg	ADMIN_EDIT	2026-02-08 10:31:17.236	16.475438800000000000000000000000	99.553667600000000000000000000000	-wfhbzg	GPS	APPROVED	12.021454444444440000000000000000	0.520000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	cml61rz7u000111dofdoy94sd	2026-02-08 03:29:54.248	2026-02-07 23:22:34.268	2026-02-21 03:26:14.465	83	2026-02-08 04:27:27.108	0.000000000000000000000000000000	2026-02-08 03:03:30.425
cmlcywbr40003infbmspm27d9	cml5g1vmh001aua47rlxc2pr1	2026-02-07 17:00:00	2026-02-07 23:50:47.774	16.475140800000000000000000000000	99.553648700000000000000000000000	2hlpr1	GPS	2026-02-08 03:00:42.246	16.475206400000000000000000000000	99.553639000000000000000000000000	2hlpr1	GPS	APPROVED	2.150000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 23:50:48.449	2026-02-08 03:00:43.371	\N	\N	0.000000000000000000000000000000	\N
cmlcz3go30005infbknqioiev	cml6ctvtp001puqrgr6j1clm9	2026-02-07 17:00:00	2026-02-07 23:56:20.978	16.475228400000000000000000000000	99.553841000000010000000000000000	4zl33m	QR	2026-02-08 05:00:37.684	16.475176000000000000000000000000	99.553702599999990000000000000000	4zl33m	GPS	APPROVED	4.070000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 23:56:21.411	2026-02-08 05:00:38.112	\N	\N	0.000000000000000000000000000000	\N
cmlcyrebz0001infb5ksylokf	cml6ctuwf0001uqrgn7ktp9je	2026-02-07 17:00:00	2026-02-07 23:46:57.841	16.436203300000000000000000000000	99.512074400000000000000000000000	4uyosu	QR	2026-02-08 05:01:31.354	16.436366600000000000000000000000	99.511836700000000000000000000000	4uyosu	GPS	APPROVED	4.230000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 23:46:58.511	2026-02-08 05:01:32.036	\N	\N	0.000000000000000000000000000000	\N
cmlefjffm000112e70boxhc23	cml6ctvb9000puqrgafxo42i7	2026-02-08 17:00:00	2026-02-09 00:24:25.908	16.436284000000000000000000000000	99.512033900000010000000000000000	-xgf12i	QR	2026-02-09 12:25:22.834	16.436297000000000000000000000000	99.512057700000000000000000000000	-xgf12i	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-09 00:24:26.338	2026-02-09 12:25:23.269	\N	\N	0.000000000000000000000000000000	\N
cmlcycab20001azwqloq31bc6	cml6ctvms0019uqrg4ft54y7j	2026-02-07 17:00:00	2026-02-07 23:35:13.022	16.455096000000000000000000000000	99.530148400000000000000000000000	-1n18s4	QR	2026-02-08 06:00:32.133	16.454954200000000000000000000000	99.529908900000000000000000000000	-v747np	GPS	APPROVED	5.420000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 23:35:13.454	2026-02-08 06:00:34.314	\N	\N	0.000000000000000000000000000000	\N
cmlczdwfm0009infblsqz3zuc	cml5waf57000114p7u4pb0j1l	2026-02-07 17:00:00	2026-02-08 00:04:27.568	16.475191300000000000000000000000	99.553636600000000000000000000000	4uyosu	QR	2026-02-08 08:55:23.689	16.475180300000000000000000000000	99.553828800000010000000000000000	4uyosu	GPS	APPROVED	7.830000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-08 00:04:28.194	2026-02-08 08:55:24.322	\N	\N	0.000000000000000000000000000000	\N
cmlcz23490001tnwg57bs58vo	cml6cv8ts000513l7uydg8j16	2026-02-07 17:00:00	2026-02-07 23:55:16.772	16.475188300000000000000000000000	99.553639800000000000000000000000	-h2k8cv	QR	2026-02-08 10:12:53.34	16.475679000000000000000000000000	99.553353400000010000000000000000	-h2k8cv	GPS	APPROVED	9.279999999999999000000000000000	1.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 23:55:17.193	2026-02-08 10:12:53.801	\N	\N	0.000000000000000000000000000000	\N
cmlcxvhyt00014aez48ads8bv	cml5g1xzx001oua47iy5u23oh	2026-02-07 17:00:00	2026-02-07 23:22:09.533	16.475145000000000000000000000000	99.553727100000000000000000000000	g3up74	QR	2026-02-08 11:30:52.554	16.475132700000000000000000000000	99.553746500000000000000000000000	g3up74	GPS	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 23:22:10.229	2026-02-08 11:30:53.218	\N	\N	0.000000000000000000000000000000	2026-02-08 04:30:25.828
cmld06mcx0001avw5vmj5pgsv	cml6ctuyp0003uqrgejbtvcmm	2026-02-07 17:00:00	2026-02-08 00:26:47.937	16.436361900000000000000000000000	99.511871000000000000000000000000	-w9hfrz	QR	2026-02-08 12:26:09.719	16.436302800000000000000000000000	99.512034200000000000000000000000	-w9hfrz	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-08 00:26:48.369	2026-02-08 12:26:10.147	\N	\N	0.000000000000000000000000000000	\N
cmllkiwy60001ods0hoogpl27	cml6ctvqa001huqrgn8fa8qe5	2026-02-13 17:00:00	2026-02-14 00:18:23.039	16.455068000000000000000000000000	99.530173400000000000000000000000	g3up74	QR	2026-02-14 05:28:30.814	16.454899500000000000000000000000	99.530165600000000000000000000000	g3up74	GPS	APPROVED	4.170000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-14 00:18:23.695	2026-02-14 05:28:31.476	\N	\N	0.000000000000000000000000000000	\N
cmld0bhi200011uh4ps51tsg3	cml6ctvrh001luqrg60imh1k9	2026-02-07 17:00:00	2026-02-08 00:30:34.022	16.475167700000000000000000000000	99.553634000000000000000000000000	-tvo3gw	QR	2026-02-08 05:04:44.167	16.475163100000000000000000000000	99.553638600000000000000000000000	-tvo3gw	GPS	APPROVED	3.570000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 00:30:35.354	2026-02-09 00:43:30.465	\N	\N	0.000000000000000000000000000000	\N
cmlef18m30007shdexee9cd1s	cml5waf57000114p7u4pb0j1l	2026-02-08 17:00:00	2026-02-09 00:10:17.018	16.475184300000000000000000000000	99.553642300000010000000000000000	4uyosu	QR	2026-02-09 09:54:54.704	16.475394300000000000000000000000	99.553926399999990000000000000000	4uyosu	GPS	APPROVED	8.730000000000000000000000000000	0.730000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-09 00:10:17.691	2026-02-09 09:54:55.554	\N	\N	0.000000000000000000000000000000	\N
cmleetrcc0003pqsoh3fn31kl	cml6ctvms0019uqrg4ft54y7j	2026-02-08 17:00:00	2026-02-09 00:04:28.285	16.455100400000000000000000000000	99.530057700000000000000000000000	-1n18s4	QR	2026-02-09 12:00:26.249	16.454829200000000000000000000000	99.530180900000000000000000000000	-v747np	GPS	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	cml6ctvcw000tuqrgj8clzpzz	2026-02-09 05:36:32.012	2026-02-09 00:04:28.716	2026-02-09 12:00:27.083	36	2026-02-09 05:36:43.952	0.000000000000000000000000000000	2026-02-09 05:00:13.849
cmlecj6zy000714l90u1jtux7	cml6ctvja0013uqrgbdjr4l0e	2026-02-08 17:00:00	2026-02-08 23:00:16.13	16.455093200000000000000000000000	99.530097400000000000000000000000	-xk7lgp	QR	2026-02-09 11:03:08.253	16.455082800000000000000000000000	99.530116900000000000000000000000	cs669g	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:00:16.558	2026-02-09 11:03:08.672	88	2026-02-09 06:00:04.414	0.000000000000000000000000000000	2026-02-09 04:31:50.573
cmlefk55o000312e7v54cp5sb	cml6ctuyp0003uqrgejbtvcmm	2026-02-08 17:00:00	2026-02-09 00:24:59.245	16.436216600000000000000000000000	99.512141700000000000000000000000	-w9hfrz	QR	2026-02-09 12:26:25.859	16.436385100000000000000000000000	99.511803200000000000000000000000	-w9hfrz	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-09 00:24:59.676	2026-02-09 12:26:26.294	\N	\N	0.000000000000000000000000000000	\N
cmlecm8al0007kwp4j8niac34	cml6ctuzt0005uqrgdnihhrcg	2026-02-08 17:00:00	2026-02-08 23:02:37.789	16.436233600000000000000000000000	99.512045500000000000000000000000	-tvo3gw	QR	2026-02-09 11:07:39.068	16.436356100000000000000000000000	99.511884800000000000000000000000	-tvo3gw	GPS	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:02:38.205	2026-02-09 11:07:39.49	59	2026-02-09 05:04:33.302	0.000000000000000000000000000000	2026-02-09 04:05:12.329
cmleeoivx0005shde92pv204w	cml6ctvtp001puqrgr6j1clm9	2026-02-08 17:00:00	2026-02-09 00:00:24.008	16.475199500000000000000000000000	99.553796100000000000000000000000	4zl33m	QR	2026-02-09 09:56:21.875	16.475151200000000000000000000000	99.553687900000000000000000000000	4zl33m	GPS	APPROVED	8.920000000000000000000000000000	0.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-09 00:00:24.477	2026-02-09 09:56:22.308	\N	\N	0.000000000000000000000000000000	\N
cmleew9xy0005pqsowc22p4k3	cml6ctvqa001huqrgn8fa8qe5	2026-02-08 17:00:00	2026-02-09 00:06:25.705	16.455039800000000000000000000000	99.530188200000000000000000000000	g3up74	QR	2026-02-09 10:01:54.051	16.455111500000000000000000000000	99.530499000000010000000000000000	g2yb0x	GPS	APPROVED	8.920000000000000000000000000000	0.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-09 00:06:26.134	2026-02-09 10:01:54.476	\N	\N	0.000000000000000000000000000000	\N
cmleeabij000178t1rwm04ds7	cml6cv8sm000313l7yhueq5zy	2026-02-08 17:00:00	2026-02-08 23:49:21.296	16.455028500000000000000000000000	99.530153000000000000000000000000	-oka4kb	QR	2026-02-09 10:02:20.037	16.455078800000000000000000000000	99.530132400000000000000000000000	jl0pv7	GPS	APPROVED	9.199999999999999000000000000000	1.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:49:21.739	2026-02-09 10:02:20.457	\N	\N	0.000000000000000000000000000000	\N
cmleeg27r000378t1arz9a038	cml6ctuwf0001uqrgn7ktp9je	2026-02-08 17:00:00	2026-02-08 23:53:48.96	16.436193700000000000000000000000	99.512103000000000000000000000000	4uyosu	GPS	2026-02-09 10:04:57.585	16.436215800000000000000000000000	99.511954800000000000000000000000	4uyosu	GPS	APPROVED	9.180000000000000000000000000000	1.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:53:49.623	2026-02-09 10:04:58.213	\N	\N	0.000000000000000000000000000000	\N
cmleck9nb000914l93ktpvu7s	cml5w8h240001ugxaadqh8irg	2026-02-08 17:00:00	2026-02-08 23:01:06.222	16.475135500000000000000000000000	99.553754900000000000000000000000	-zcd007	QR	2026-02-14 23:00:54.317	16.475164000000000000000000000000	99.553659200000000000000000000000	vpjg0o	GPS	APPROVED	142.980000000000000000000000000000	134.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 23:01:06.647	2026-02-14 23:00:54.747	\N	\N	0.000000000000000000000000000000	\N
cmlki6tzi0001l5qllnfetvrr	cml5cxygj0003v68ql9533bl3	2026-02-12 17:00:00	2026-02-13 06:25:14.081	16.475170200000000000000000000000	99.553631600000000000000000000000	-wfhbzg	QR	2026-02-15 05:40:33.098	16.475182400000000000000000000000	99.553636700000000000000000000000	-wfhbzg	GPS	APPROVED	46.250000000000000000000000000000	38.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-13 07:33:18.7	2026-02-13 06:25:14.575	2026-02-15 05:40:33.536	\N	\N	0.000000000000000000000000000000	\N
cmlkjf2tl0001yagg7xpotald	cml5g1tky000wua47qqpf53wn	2026-02-13 00:00:00	2026-02-13 00:00:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	30	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-13 06:59:38.889	2026-02-13 06:59:38.889	\N	\N	0.000000000000000000000000000000	\N
cmlegz92w0005mntcuhzgysyn	cml6ctva5000nuqrg8wh05sro	2026-02-08 17:00:00	2026-02-09 01:04:43.793	16.436301700000000000000000000000	99.511959500000000000000000000000	l62qcv	QR	2026-02-09 01:07:51.892	16.436302200000000000000000000000	99.512047499999990000000000000000	l62qcv	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 01:04:44.216	2026-02-10 00:06:39.342	\N	\N	0.000000000000000000000000000000	\N
cmlbnydfn0001pmw5etbw8789	cml5g20im0022ua4780xu5bou	2026-02-06 17:00:00	2026-02-07 01:56:41.323	16.475176100000000000000000000000	99.553638199999990000000000000000	-nselrn	GPS	2026-02-07 13:56:41.323	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 01:56:41.988	2026-02-20 22:24:36.448	0	2026-02-07 07:43:25.041	0.000000000000000000000000000000	2026-02-07 07:43:01.075
cmlfunxhb0001dk0dwwp7wl0z	cml5waf57000114p7u4pb0j1l	2026-02-09 17:00:00	2026-02-10 00:15:36.127	16.475234600000000000000000000000	99.553704000000000000000000000000	4uyosu	QR	2026-02-10 09:57:49.479	16.475300100000000000000000000000	99.553909500000000000000000000000	4uyosu	GPS	APPROVED	8.699999999999999000000000000000	0.700000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 00:15:36.767	2026-02-11 00:23:23.321	\N	\N	0.000000000000000000000000000000	\N
cmlfv9zyw0001dyoaja1bsgtf	cml6cv8w4000913l7imruilgz	2026-02-09 17:00:00	2026-02-10 00:32:46.007	16.475350100000000000000000000000	99.553610100000000000000000000000	-7x56ss	QR	2026-02-10 10:05:12.528	16.475179100000000000000000000000	99.553635000000000000000000000000	-x7wv4j	GPS	APPROVED	8.529999999999999000000000000000	0.530000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 00:32:46.424	2026-02-11 00:23:23.321	\N	\N	0.000000000000000000000000000000	\N
cmlfvs4ea0001myfhyc47uq9c	cml6ctvp6001fuqrgjo0cut8g	2026-02-09 17:00:00	2026-02-10 00:46:51.522	16.455029600000000000000000000000	99.530025499999990000000000000000	-ilt8ll	QR	2026-02-10 10:11:52.765	16.455481300000000000000000000000	99.529903899999990000000000000000	-jkouny	GPS	APPROVED	8.420000000000000000000000000000	0.420000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 00:46:51.97	2026-02-11 00:23:23.321	\N	\N	0.000000000000000000000000000000	\N
cmlfv23j50001kcp7gori94es	cml6ctuyp0003uqrgejbtvcmm	2026-02-09 17:00:00	2026-02-10 00:26:37.333	16.436257200000000000000000000000	99.512025700000000000000000000000	-w9hfrz	QR	2026-02-10 12:26:28.488	16.436203000000000000000000000000	99.512104800000000000000000000000	-w9hfrz	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 00:26:37.793	2026-02-11 00:23:23.321	\N	\N	0.000000000000000000000000000000	\N
cmlfw8jy7000310ujr3jpz6bp	cml5g22hz002gua47temxhj1t	2026-02-09 17:00:00	2026-02-10 00:59:37.968	16.475185000000000000000000000000	99.553650899999990000000000000000	ccsx7a	GPS	2026-02-10 13:01:26.143	16.475192600000000000000000000000	99.553656399999990000000000000000	ccsx7a	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 00:59:38.623	2026-02-11 00:23:23.321	95	2026-02-10 06:05:27.62	0.000000000000000000000000000000	2026-02-10 04:30:19.422
cmlfvb0j80003dyoabel49tc8	cml6ctvrh001luqrg60imh1k9	2026-02-09 17:00:00	2026-02-10 00:33:33.108	16.475187500000000000000000000000	99.553658500000000000000000000000	-tvo3gw	GPS	2026-02-10 10:46:31.697	16.475206700000000000000000000000	99.553662100000000000000000000000	-tvo3gw	GPS	APPROVED	9.199999999999999000000000000000	1.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 00:33:33.813	2026-02-11 00:23:23.321	\N	\N	0.000000000000000000000000000000	\N
cmlhduisu00016zguae4lax2p	cml6ctvhm0011uqrgd2s6gv12	2026-02-10 17:00:00	2026-02-11 02:00:22.322	16.455108600000000000000000000000	99.530195400000000000000000000000	-8w3vna	QR	2026-02-11 14:04:31.554	16.455025000000000000000000000000	99.530168600000000000000000000000	qvxl8t	GPS	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-11 02:00:37.916	2026-02-11 02:00:23.214	2026-02-11 14:04:32.411	\N	\N	0.000000000000000000000000000000	\N
cmlh9r8af000j11shckdp3lmn	cml6ctvtp001puqrgr6j1clm9	2026-02-10 17:00:00	2026-02-11 00:05:50.701	16.475179500000000000000000000000	99.553638000000010000000000000000	4zl33m	QR	2026-02-11 09:55:13.428	16.475515200000000000000000000000	99.553856000000000000000000000000	4zl33m	GPS	APPROVED	8.820000000000000000000000000000	0.820000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-11 00:05:51.16	2026-02-11 09:55:13.859	\N	\N	0.000000000000000000000000000000	\N
cmlh9a8gk000f11shgqd45yls	cml6ctuwf0001uqrgn7ktp9je	2026-02-10 17:00:00	2026-02-10 23:52:37.591	16.436315800000000000000000000000	99.511938099999990000000000000000	4uyosu	GPS	2026-02-11 10:11:27.188	16.436236900000000000000000000000	99.512003800000000000000000000000	4uyosu	GPS	APPROVED	9.300000000000001000000000000000	1.300000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:52:38.228	2026-02-11 10:11:28.427	\N	\N	0.000000000000000000000000000000	\N
cmlh7fmzp0003f7kswvwzgs7b	cml6ctvja0013uqrgbdjr4l0e	2026-02-10 17:00:00	2026-02-10 23:00:50.465	16.455067700000000000000000000000	99.530125200000000000000000000000	-xk7lgp	QR	2026-02-11 11:02:00.914	16.455034100000000000000000000000	99.530144100000000000000000000000	cs669g	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:00:51.109	2026-02-11 11:02:01.335	90	2026-02-11 06:02:01.712	0.000000000000000000000000000000	2026-02-11 04:31:11.401
cmlh9qwql000h11sh76hg4tk6	cml6ctv0x0007uqrgprf5lu7c	2026-02-10 17:00:00	2026-02-11 00:05:35.736	16.436341179941550000000000000000	99.511354628216710000000000000000	-85vz5c	QR	2026-02-11 12:18:29.962	16.436391148321960000000000000000	99.511781222176480000000000000000	-85vz5c	GPS	APPROVED	11.200000000000000000000000000000	3.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-11 00:05:36.189	2026-02-11 12:18:30.389	59	2026-02-11 06:15:50.933	0.000000000000000000000000000000	2026-02-11 05:16:32.57
cmlomtrt10001ynnnne8vebcb	cml5g1tky000wua47qqpf53wn	2026-02-15 17:00:00	2026-02-16 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-16 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-16 03:46:08.005	2026-02-22 03:32:46.64	\N	\N	0.000000000000000000000000000000	\N
cmllh07vd0001al5vigkv0ldk	cml6ctvkk0015uqrg9iuy6dh1	2026-02-13 17:00:00	2026-02-13 22:39:51.875	16.454819371849100000000000000000	99.530336247413840000000000000000	phfpd5	QR	2026-02-14 06:51:37.007	16.454899547582680000000000000000	99.530296342776240000000000000000	phfpd5	GPS	APPROVED	7.180000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 22:39:52.538	2026-02-14 06:51:37.656	\N	\N	0.000000000000000000000000000000	\N
cmllhl9ga00033r6q694phd51	cml6ctvnx001buqrgfzjexn6r	2026-02-13 17:00:00	2026-02-13 22:56:13.313	16.455006700000000000000000000000	99.530064999999990000000000000000	-3nueuy	QR	2026-02-14 13:04:28.118	16.455081700000000000000000000000	99.529745500000000000000000000000	-3nueuy	GPS	APPROVED	13.130000000000000000000000000000	5.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 22:56:14.363	2026-02-14 13:04:29.022	\N	\N	0.000000000000000000000000000000	\N
cmllhpif7000110b34z476h6j	cml6ctuzt0005uqrgdnihhrcg	2026-02-13 17:00:00	2026-02-13 22:59:31.96	16.436506000000000000000000000000	99.511880300000000000000000000000	-tvo3gw	QR	2026-02-14 05:10:31.23	16.436374900000000000000000000000	99.511851900000000000000000000000	-tvo3gw	GPS	APPROVED	5.170000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 22:59:32.611	2026-02-14 05:10:31.857	\N	\N	0.000000000000000000000000000000	\N
cmllgnzbh0001ip9yjc4tlg1q	cml6ctvcw000tuqrgj8clzpzz	2026-02-13 17:00:00	2026-02-13 22:30:20.933	16.455486374612000000000000000000	99.530256641515790000000000000000	-oj16l7	QR	2026-02-14 05:38:17.968	16.455149506232800000000000000000	99.530182750988320000000000000000	-oj16l7	GPS	APPROVED	6.120000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 22:30:21.581	2026-02-14 05:38:18.398	\N	\N	0.000000000000000000000000000000	\N
cmlfy8bi6000312vahykhzbdq	cml5g289u003uua47ulssk26x	2026-02-09 17:00:00	2026-02-10 02:00:00	16.475431000000000000000000000000	99.553636500000000000000000000000	ktr8uu	ADMIN_BACKFILL	2026-02-10 14:00:00	16.475185600000000000000000000000	99.553648499999990000000000000000	ktr8uu	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 01:55:26.911	2026-02-22 03:32:55.012	90	2026-02-10 07:31:27.802	0.000000000000000000000000000000	2026-02-10 06:01:18.748
cmlgk6y1w0001tf48d43r2cjs	cml6ctva5000nuqrg8wh05sro	2026-02-09 17:00:00	2026-02-10 12:10:13.945	16.436317100000000000000000000000	99.511903200000010000000000000000	l62qcv	QR	2026-02-14 17:00:29.951	16.436366700000000000000000000000	99.511851400000000000000000000000	4zl33m	GPS	APPROVED	99.830000000000000000000000000000	91.830000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 12:10:14.372	2026-02-14 17:00:30.877	\N	\N	0.000000000000000000000000000000	\N
cmlilnc570001k8u7uo3aypg4	cml6ctvcw000tuqrgj8clzpzz	2026-02-11 17:00:00	2026-02-11 22:26:30.681	16.455192086302170000000000000000	99.530033720749930000000000000000	-oj16l7	QR	2026-02-12 06:12:09.251	16.455219956130210000000000000000	99.530085940006690000000000000000	-oj16l7	GPS	APPROVED	6.750000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 22:26:31.1	2026-02-12 06:12:09.695	\N	\N	0.000000000000000000000000000000	\N
cmlipszg50001dhmtbl7nuim7	cml6ctvwy001xuqrgl2hwd8y1	2026-02-12 00:00:00	2026-02-12 00:22:00	\N	\N	\N	MANUAL	2026-02-12 12:30:00	\N	\N	\N	MANUAL	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	112	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-12 00:22:53.045	2026-02-12 14:00:38.047	\N	\N	0.000000000000000000000000000000	\N
cmlgi2fma00013893xsgjef29	cml6ctv4g000duqrgdybgtyte	2026-02-09 17:00:00	2026-02-10 11:10:43.984	16.436489200000000000000000000000	99.511770000000000000000000000000	7uvltx	QR	2026-02-15 23:10:50.515	16.436379300000000000000000000000	99.511855900000000000000000000000	7uvltx	GPS	APPROVED	131.000000000000000000000000000000	123.000000000000000000000000000000	10	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 11:10:44.626	2026-02-15 23:10:51.38	\N	\N	0.000000000000000000000000000000	\N
cmlghzqtn0005r8mni446pv1v	cml6ctv5n000fuqrg94t826wg	2026-02-09 17:00:00	2026-02-10 11:08:38.497	16.436246200000000000000000000000	99.512158600000010000000000000000	jzx37b	GPS	2026-02-15 23:11:30.742	16.436329500000000000000000000000	99.511753300000000000000000000000	jzx37b	GPS	APPROVED	131.030000000000000000000000000000	123.030000000000000000000000000000	8	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 11:08:39.179	2026-02-15 23:11:31.866	\N	\N	0.000000000000000000000000000000	\N
cmllji8dd00031111cydyzfqg	cml6ctvms0019uqrg4ft54y7j	2026-02-13 17:00:00	2026-02-13 23:49:51.596	16.455161400000000000000000000000	99.530123300000000000000000000000	-1n18s4	QR	2026-02-14 12:00:39.933	16.455170500000000000000000000000	99.530144400000000000000000000000	-tqfgt7	GPS	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 23:49:52.225	2026-02-14 12:00:40.869	61	2026-02-14 06:02:55.663	0.000000000000000000000000000000	2026-02-14 05:01:51.276
cmlk8dzc00001x1mu6r1p1a4v	cml5g22hz002gua47temxhj1t	2026-02-12 17:00:00	2026-02-13 01:50:50.832	16.475096000000000000000000000000	99.553342800000000000000000000000	ccsx7a	GPS	2026-02-13 14:02:28.967	16.475137300000000000000000000000	99.553826000000000000000000000000	ccsx7a	GPS	APPROVED	11.180000000000000000000000000000	3.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 01:50:51.936	2026-02-14 00:24:56.285	91	2026-02-13 07:01:23.166	0.000000000000000000000000000000	2026-02-13 05:30:14.589
cmlerfljv000112pk1xjg7f0f	cml6ctv90000luqrg6v3qvfs7	2026-02-09 00:00:00	2026-02-08 23:30:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	REJECTED	\N	\N	0	\N	0.000000000000000000000000000000	\N	cml6ctv6r000huqrg08xd4xcm	2026-02-09 05:58:35.211	2026-02-09 05:57:23.035	2026-02-09 05:58:35.212	\N	\N	0.000000000000000000000000000000	\N
cmld07goc0003avw5d8a9vztg	cml6ctva5000nuqrg8wh05sro	2026-02-07 17:00:00	2026-02-08 00:27:27.236	16.436318100000000000000000000000	99.511977300000000000000000000000	l62qcv	QR	2026-02-14 17:01:17.994	16.436160100000000000000000000000	99.512069999999990000000000000000	4zl33m	GPS	APPROVED	159.550000000000000000000000000000	151.550000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-08 00:27:27.66	2026-02-14 17:01:18.858	\N	\N	0.000000000000000000000000000000	\N
cmleeo8rv0003shdezmhbms4j	cml6ctvsk001nuqrgooayfxde	2026-02-08 17:00:00	2026-02-09 00:00:10.435	16.475156500000000000000000000000	99.553629400000010000000000000000	-xk7lgp	GPS	2026-02-09 09:55:14.797	16.475558900000000000000000000000	99.553817900000000000000000000000	-xk7lgp	GPS	APPROVED	8.920000000000000000000000000000	0.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-09 00:00:11.371	2026-02-09 09:55:15.432	\N	\N	0.000000000000000000000000000000	\N
cmlebfo560003p92omknj55mo	cml6ctvgi000zuqrguiuyi2de	2026-02-08 17:00:00	2026-02-08 22:29:32.108	16.455100600000000000000000000000	99.530111199999990000000000000000	-1n18s4	QR	2026-02-09 10:31:00.997	16.455116900000000000000000000000	99.530169200000000000000000000000	hl88nd	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-08 22:52:25.563	2026-02-08 22:29:32.538	2026-02-09 10:31:01.445	87	2026-02-09 04:28:35.27	0.000000000000000000000000000000	2026-02-09 03:01:24.668
cmlhadg4o000n11shvpek6vs7	cml6ctvb9000puqrgafxo42i7	2026-02-10 17:00:00	2026-02-11 00:23:07.302	16.436266800000000000000000000000	99.512005000000000000000000000000	-xgf12i	QR	2026-02-11 12:18:10.978	16.436196400000000000000000000000	99.512177200000000000000000000000	-xgf12i	GPS	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-11 00:23:07.752	2026-02-11 12:18:11.408	\N	\N	0.000000000000000000000000000000	\N
cmlechezr000514l9yerblnab	cml5g1qzg000iua472zcpgugd	2026-02-08 17:00:00	2026-02-08 22:58:52.971	16.475214500000000000000000000000	99.553639600000000000000000000000	-8s2lny	QR	2026-02-09 11:00:05.273	16.475181600000000000000000000000	99.553690800000000000000000000000	-8s2lny	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 22:58:53.607	2026-02-09 11:00:05.944	86	2026-02-09 04:28:41.692	0.000000000000000000000000000000	2026-02-09 03:02:25.445
cmlim4frd00032qdfdvdthhqu	cml6ctvkk0015uqrg9iuy6dh1	2026-02-11 17:00:00	2026-02-11 22:39:48.512	16.454808284647180000000000000000	99.530343014780800000000000000000	phfpd5	QR	2026-02-12 06:44:10.277	16.455028000572630000000000000000	99.530282339705780000000000000000	phfpd5	GPS	APPROVED	7.070000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 22:39:48.937	2026-02-12 06:44:10.697	\N	\N	0.000000000000000000000000000000	\N
cmlhbdg1a0005r3ax3m6wj2aq	cml6ctvqa001huqrgn8fa8qe5	2026-02-10 17:00:00	2026-02-11 00:51:06.82	16.455107900000000000000000000000	99.530117200000010000000000000000	g3up74	QR	2026-02-11 06:03:39.492	16.455002600000000000000000000000	99.530135000000000000000000000000	g3up74	GPS	APPROVED	4.200000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-11 02:00:19.321	2026-02-11 00:51:07.247	2026-02-11 06:03:39.925	\N	\N	0.000000000000000000000000000000	\N
cmleeqg040001pqso1e085i5i	cml6ctv0x0007uqrgprf5lu7c	2026-02-08 17:00:00	2026-02-09 00:01:53.621	16.436196328295070000000000000000	99.511751173252880000000000000000	-85vz5c	QR	2026-02-09 12:15:43.55	16.436391148321960000000000000000	99.511781222176480000000000000000	-85vz5c	GPS	APPROVED	11.220000000000000000000000000000	3.220000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-09 00:01:54.052	2026-02-09 12:15:43.984	59	2026-02-09 06:07:42.164	0.000000000000000000000000000000	2026-02-09 05:07:49.121
cmlej3dfp0003efwocu8jjxka	cml6ctvff000xuqrgvuiy6k2z	2026-02-09 00:00:00	2026-02-09 02:00:00	\N	\N	\N	MANUAL	2026-02-09 13:59:00	\N	\N	\N	MANUAL	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-09 02:03:55.717	2026-02-09 14:00:00.784	\N	\N	0.000000000000000000000000000000	\N
cmlerpcfm00014m5x45srbeyg	cml6ctvhm0011uqrgd2s6gv12	2026-02-09 00:00:00	2026-02-09 02:00:00	\N	\N	\N	MANUAL	2026-02-09 13:59:00	\N	\N	\N	MANUAL	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-09 06:04:57.778	2026-02-09 14:00:54.686	\N	\N	0.000000000000000000000000000000	\N
cmlfs326200015ta031upgbxm	cml6ctv6r000huqrg08xd4xcm	2026-02-09 17:00:00	2026-02-09 23:03:23.4	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	QR	2026-02-10 06:44:53.299	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	GPS	APPROVED	6.680000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 23:03:23.834	2026-02-10 06:44:53.725	\N	\N	0.000000000000000000000000000000	\N
cmlft57e3000112qsa0v1c46z	cml6cv8ts000513l7uydg8j16	2026-02-09 17:00:00	2026-02-09 23:33:03.094	16.475325800000000000000000000000	99.553653999999990000000000000000	-p0zg9d	QR	2026-02-10 10:04:31.896	16.475689600000000000000000000000	99.553386900000010000000000000000	-p0zg9d	GPS	APPROVED	9.520000000000000000000000000000	1.520000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 23:33:03.531	2026-02-10 10:04:32.747	\N	\N	0.000000000000000000000000000000	\N
cmlhbcnbt0003r3axi9l38f1u	cml6ctvp6001fuqrgjo0cut8g	2026-02-10 17:00:00	2026-02-11 00:50:29.615	16.455090000000000000000000000000	99.530117000000000000000000000000	-ilt8ll	QR	2026-02-11 10:02:13.741	16.455239000000000000000000000000	99.529683300000000000000000000000	-ilt8ll	GPS	APPROVED	8.180000000000000000000000000000	0.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-11 02:00:25.642	2026-02-11 00:50:30.041	2026-02-11 10:02:14.165	\N	\N	0.000000000000000000000000000000	\N
cmlhmmg5i0001z0d5jafn9ebx	cml6ctv7w000juqrgh1tdiejn	2026-02-10 17:00:00	2026-02-11 06:06:00	16.436271100000000000000000000000	99.512094500000000000000000000000	rcqple	ADMIN_BACKFILL	2026-02-11 15:12:00	16.436326900000000000000000000000	99.511993800000000000000000000000	rcqple	ADMIN_BACKFILL	APPROVED	8.100000000000000000000000000000	0.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 06:06:03.078	2026-02-22 03:18:15.168	\N	\N	0.000000000000000000000000000000	\N
cmllhrica00053r6qq8p6dry4	cml5w8h240001ugxaadqh8irg	2026-02-14 00:00:00	2026-02-13 23:00:00	\N	\N	\N	MANUAL	2026-02-14 23:00:33.017	16.475528300000000000000000000000	99.553865800000000000000000000000	vpjg0o	GPS	APPROVED	23.000000000000000000000000000000	15.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-13 23:01:05.818	2026-02-14 23:00:33.447	\N	\N	0.000000000000000000000000000000	\N
cmlft0iz500035ta0mo9lrhzd	cml5g1vmh001aua47rlxc2pr1	2026-02-09 17:00:00	2026-02-09 23:29:24.638	16.475175100000000000000000000000	99.553681299999990000000000000000	2hlpr1	QR	2026-02-14 23:32:32.76	16.475200600000000000000000000000	99.553541100000000000000000000000	2hlpr1	GPS	APPROVED	119.050000000000000000000000000000	111.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 23:29:25.265	2026-02-14 23:32:33.598	109	2026-02-10 04:49:15.006	28.916666666666670000000000000000	2026-02-10 02:59:17.608
cmlptj1sh000160nwvvm1lz8q	cml6cv8uy000713l7zocqn0fn	2026-02-16 17:00:00	2026-02-16 23:41:30.137	16.475480800000000000000000000000	99.553819100000000000000000000000	-trvj2p	QR	2026-02-17 11:41:30.137	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:41:31.217	2026-02-18 23:22:10.022	\N	\N	0.000000000000000000000000000000	\N
cmlcx0htt0005trrg006hfkrs	cml6ctv3c000buqrguslcci85	2026-02-07 17:00:00	2026-02-07 22:58:03.283	16.436575924483010000000000000000	99.511574212740800000000000000000	gg44cx	QR	2026-02-08 11:12:00	16.436334860520270000000000000000	99.511508077622950000000000000000	gg44cx	MANUAL	APPROVED	11.220000000000000000000000000000	3.220000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 22:58:03.714	2026-02-21 03:17:48.749	57	2026-02-08 04:08:19.351	0.000000000000000000000000000000	2026-02-08 03:10:26.202
cmlerb4jw00016zlhcqmdfhr4	cml6ctv7w000juqrgh1tdiejn	2026-02-08 17:00:00	2026-02-09 05:53:00	16.436277700000000000000000000000	99.512097000000000000000000000000	rcqple	ADMIN_BACKFILL	2026-02-09 15:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.619999999999999000000000000000	0.620000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml61rz7u000111dofdoy94sd	2026-02-09 07:17:31.81	2026-02-09 05:53:54.381	2026-02-21 04:49:35.161	\N	\N	0.000000000000000000000000000000	\N
cmlmw2rbv0003v1y15sn47v8o	cml6ctvgi000zuqrguiuyi2de	2026-02-14 17:00:00	2026-02-14 22:29:30.855	16.455079500000000000000000000000	99.530106200000010000000000000000	-1n18s4	QR	2026-02-15 10:34:01.469	16.455068200000000000000000000000	99.530121600000000000000000000000	hl88nd	GPS	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-14 23:32:19.431	2026-02-14 22:29:31.483	2026-02-15 10:34:02.122	87	2026-02-15 04:29:29.925	0.000000000000000000000000000000	2026-02-15 03:01:32.338
cmlmxa1ms0003vk9y7ianggi7	cml5w8h240001ugxaadqh8irg	2026-02-15 00:00:00	2026-02-14 23:02:00	\N	\N	\N	MANUAL	2026-02-15 22:57:48.005	16.475181700000000000000000000000	99.553631900000000000000000000000	vpjg0o	GPS	APPROVED	22.920000000000000000000000000000	14.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-14 23:03:11.045	2026-02-15 22:57:48.894	\N	\N	0.000000000000000000000000000000	\N
cmleizeuo0001h2u6jfokegdh	cml6cv8w4000913l7imruilgz	2026-02-08 17:00:00	2026-02-09 02:00:50.501	16.475443000000000000000000000000	99.553583700000000000000000000000	-ote1eo	QR	2026-02-09 09:57:48.579	16.475176300000000000000000000000	99.553630100000010000000000000000	-x7wv4j	GPS	APPROVED	6.930000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 02:00:50.928	2026-02-10 00:06:39.342	\N	\N	0.000000000000000000000000000000	\N
cmlf1hism00011fvou41idqfb	cml6ctvz80021uqrghd4qf3t2	2026-02-08 17:00:00	2026-02-09 10:38:48.506	16.475250700000000000000000000000	99.553560500000000000000000000000	-trvj2p	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 10:38:48.934	2026-02-10 00:06:39.342	\N	\N	0.000000000000000000000000000000	\N
cmleihkal00019y3i7cgk04pn	cml5g22hz002gua47temxhj1t	2026-02-08 17:00:00	2026-02-09 01:46:57.528	16.475369300000000000000000000000	99.553515000000000000000000000000	ccsx7a	GPS	2026-02-09 13:56:06.887	16.475186800000000000000000000000	99.553746399999990000000000000000	ccsx7a	GPS	APPROVED	11.150000000000000000000000000000	3.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 01:46:58.173	2026-02-10 00:06:39.342	89	2026-02-09 07:29:39.381	0.000000000000000000000000000000	2026-02-09 06:00:24.552
cmleqn71g0001gd60irt5jh3u	cml6ctvcw000tuqrgj8clzpzz	2026-02-08 17:00:00	2026-02-09 05:35:17.426	16.455484183646950000000000000000	99.530260816321600000000000000000	-oj16l7	QR	2026-02-09 14:01:43.407	16.455054664999670000000000000000	99.530144697147920000000000000000	-oj16l7	GPS	APPROVED	7.430000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 05:35:17.861	2026-02-10 00:06:39.342	\N	\N	0.000000000000000000000000000000	\N
cmlerdv1i00014gpjdeo7lhy2	cml6ctvlp0017uqrgl43h68pm	2026-02-08 17:00:00	2026-02-09 05:56:01.609	16.455103700000000000000000000000	99.530101200000000000000000000000	-jkouny	QR	2026-02-09 14:02:28.362	16.454796800000000000000000000000	99.530194600000000000000000000000	-jkouny	GPS	APPROVED	7.100000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 05:56:02.023	2026-02-10 00:06:39.342	\N	\N	0.000000000000000000000000000000	\N
cmleiuhxo0001efwockg3h3bb	cml5g20im0022ua4780xu5bou	2026-02-08 17:00:00	2026-02-09 01:57:01.006	16.475181500000000000000000000000	99.553653299999990000000000000000	-nselrn	QR	2026-02-09 14:03:37.532	16.475174400000000000000000000000	99.553726200000000000000000000000	-nselrn	GPS	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 01:57:01.645	2026-02-10 00:06:39.342	87	2026-02-09 06:00:37.151	0.000000000000000000000000000000	2026-02-09 04:33:29.161
cmlf2mccb0003c3mhwum1i623	cml6ctv5n000fuqrg94t826wg	2026-02-08 17:00:00	2026-02-09 11:10:32.203	16.436241900000000000000000000000	99.512149800000000000000000000000	jzx37b	QR	2026-02-09 15:01:53.671	16.436186600000000000000000000000	99.512087600000000000000000000000	jzx37b	GPS	APPROVED	2.850000000000000000000000000000	0.000000000000000000000000000000	10	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 11:10:33.468	2026-02-10 00:06:39.342	\N	\N	0.000000000000000000000000000000	\N
cmlkkm6i30001fjl7iw0zxx09	cml6ctvwy001xuqrgl2hwd8y1	2026-02-13 00:00:00	2026-02-13 05:27:00	\N	\N	\N	MANUAL	2026-02-13 13:58:00	\N	\N	\N	MANUAL	APPROVED	7.520000000000000000000000000000	0.000000000000000000000000000000	417	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-13 07:33:09.867	2026-02-13 13:58:20.627	\N	\N	0.000000000000000000000000000000	\N
cmlh7ajkg000311shvbdupbjg	cml5g1qzg000iua472zcpgugd	2026-02-10 17:00:00	2026-02-10 22:56:52.76	16.475268400000000000000000000000	99.553757600000000000000000000000	-8s2lny	QR	2026-02-11 11:04:26.63	16.475184300000000000000000000000	99.553638100000000000000000000000	-8s2lny	GPS	APPROVED	11.120000000000000000000000000000	3.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 22:56:53.392	2026-02-11 11:04:27.89	88	2026-02-11 05:58:49.055	0.000000000000000000000000000000	2026-02-11 04:30:24.43
cmlfrz0tz0007hpn4us1sujj4	cml5w8h240001ugxaadqh8irg	2026-02-09 17:00:00	2026-02-09 23:00:15.054	16.475347900000000000000000000000	99.553790199999990000000000000000	-zcd007	QR	2026-02-13 22:59:56.738	16.475308900000000000000000000000	99.553621000000010000000000000000	vpjg0o	GPS	APPROVED	94.980000000000000000000000000000	86.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 23:00:15.48	2026-02-13 22:59:57.379	\N	\N	0.000000000000000000000000000000	2026-02-10 09:04:30.658
cmla33far00074e16dxlxp4ih	cml5g1xzx001oua47iy5u23oh	2026-02-05 17:00:00	2026-02-05 23:24:57.971	16.475115300000000000000000000000	99.553728900000000000000000000000	g3up74	QR	2026-02-14 00:37:57.223	16.475466600000000000000000000000	99.553867999999990000000000000000	g3up74	GPS	APPROVED	192.200000000000000000000000000000	184.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-05 23:24:59.44	2026-02-14 00:37:57.863	\N	\N	0.000000000000000000000000000000	2026-02-06 04:00:41.592
cml8lph140001tv75s0a3drlw	cml6ctvwy001xuqrgl2hwd8y1	2026-02-05 00:00:00	2026-02-04 22:30:28.552	16.475145400000000000000000000000	99.553775599999990000000000000000	-wfhbzg	QR	2026-02-14 05:37:28.637	16.455091800000000000000000000000	99.530108100000010000000000000000	-wfhbzg	GPS	APPROVED	222.120000000000000000000000000000	214.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 22:30:28.984	2026-02-14 05:37:29.282	88	2026-02-05 11:28:47.998	0.000000000000000000000000000000	2026-02-05 10:00:25.268
cmlptw39e0003tw3nt5jix5og	cml6cv8ts000513l7uydg8j16	2026-02-16 17:00:00	2026-02-16 23:51:39.011	16.475185000000000000000000000000	99.553641600000010000000000000000	-p0zg9d	QR	2026-02-17 10:33:03.184	16.475416800000000000000000000000	99.553755600000000000000000000000	-p0zg9d	GPS	APPROVED	9.680000000000000000000000000000	1.680000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:51:39.65	2026-02-17 10:33:03.82	\N	\N	0.000000000000000000000000000000	\N
cmlh9rei6000l11shp98x3xoe	cml5g1xzx001oua47iy5u23oh	2026-02-10 17:00:00	2026-02-11 00:00:00	16.475175300000000000000000000000	99.553640300000000000000000000000	g3up74	ADMIN_BACKFILL	2026-02-11 02:00:00	16.475440300000000000000000000000	99.553808700000000000000000000000	g3up74	ADMIN_BACKFILL	APPROVED	1.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-11 00:05:59.214	2026-02-22 03:33:07.169	\N	\N	0.000000000000000000000000000000	\N
cmlf2houp0001c3mhhjcppnw9	cml6ctv4g000duqrgdybgtyte	2026-02-08 17:00:00	2026-02-09 11:06:55.766	16.436460100000000000000000000000	99.511886200000010000000000000000	7uvltx	QR	2026-02-10 11:06:55.766	\N	\N	\N	\N	APPROVED	24.000000000000000000000000000000	\N	6	\N	50.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 26 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 11:06:56.401	2026-02-16 11:07:13.583	\N	\N	0.000000000000000000000000000000	\N
cmlfqybxw0001oz27bb4d9jwp	cml6ctvkk0015uqrg9iuy6dh1	2026-02-09 17:00:00	2026-02-09 22:31:43.162	16.455157133765940000000000000000	99.530211836192320000000000000000	phfpd5	QR	2026-02-10 06:28:52.771	16.455402569409240000000000000000	99.530154508111410000000000000000	phfpd5	GPS	APPROVED	6.950000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 22:31:43.604	2026-02-10 06:28:53.221	\N	\N	0.000000000000000000000000000000	\N
cmlfqt2pc00031101h9zl6boc	cml6ctvcw000tuqrgj8clzpzz	2026-02-09 17:00:00	2026-02-09 22:27:37.927	16.455361723605370000000000000000	99.529919783429210000000000000000	-oj16l7	QR	2026-02-10 05:47:33.739	16.455178004704840000000000000000	99.529982423502520000000000000000	-oj16l7	GPS	APPROVED	6.320000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 22:27:38.352	2026-02-10 05:47:34.164	\N	\N	0.000000000000000000000000000000	\N
cmlfthuwq000512qs5hvoh53v	cml6ctvms0019uqrg4ft54y7j	2026-02-09 17:00:00	2026-02-09 23:42:53.45	16.455090400000000000000000000000	99.529738300000010000000000000000	-1n18s4	QR	2026-02-10 12:00:10.73	16.454942100000000000000000000000	99.530133400000000000000000000000	-v747np	GPS	APPROVED	11.280000000000000000000000000000	3.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 23:42:53.882	2026-02-10 12:00:11.634	6	2026-02-10 05:14:18.958	0.000000000000000000000000000000	2026-02-10 05:07:22.838
cmlfrrpg90001hpn4afbb40bq	cml6ctuzt0005uqrgdnihhrcg	2026-02-09 17:00:00	2026-02-09 22:54:33.682	16.436193500000000000000000000000	99.512062900000000000000000000000	-tvo3gw	QR	2026-02-10 11:09:02.64	16.436379900000000000000000000000	99.511757500000000000000000000000	-tvo3gw	GPS	APPROVED	11.230000000000000000000000000000	3.230000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 22:54:34.137	2026-02-10 11:09:03.096	59	2026-02-10 05:11:44.8	0.000000000000000000000000000000	2026-02-10 04:12:19.738
cmlfu4tah000322thz1xa2829	cml6ctvtp001puqrgr6j1clm9	2026-02-09 17:00:00	2026-02-10 00:00:44.447	16.475158000000000000000000000000	99.553638900000000000000000000000	4zl33m	QR	2026-02-10 09:58:04.914	16.475363700000000000000000000000	99.553683000000010000000000000000	jzx37b	GPS	APPROVED	8.949999999999999000000000000000	0.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-10 00:00:44.873	2026-02-10 09:58:05.335	\N	\N	0.000000000000000000000000000000	\N
cmlfuanel0001panjx1uwgqs9	cml6ctvsk001nuqrgooayfxde	2026-02-09 17:00:00	2026-02-10 00:05:16.508	16.475204600000000000000000000000	99.553816500000000000000000000000	-xk7lgp	QR	2026-02-10 10:02:20.093	16.475345500000000000000000000000	99.553771400000000000000000000000	-xk7lgp	GPS	APPROVED	8.949999999999999000000000000000	0.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-10 00:05:17.181	2026-02-10 10:02:21.4	\N	\N	0.000000000000000000000000000000	\N
cmlftrewe0001gmqs7gtuivby	cml6cv8sm000313l7yhueq5zy	2026-02-09 17:00:00	2026-02-09 23:50:19.246	16.455125600000000000000000000000	99.530171499999990000000000000000	-oka4kb	QR	2026-02-10 10:02:48.947	16.455007000000000000000000000000	99.530027200000010000000000000000	jl0pv7	GPS	APPROVED	9.199999999999999000000000000000	1.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 23:50:19.694	2026-02-10 10:02:49.41	\N	\N	0.000000000000000000000000000000	\N
cmlft5gh6000312qs7vkvk7wi	cml6cv8uy000713l7zocqn0fn	2026-02-09 17:00:00	2026-02-09 23:33:14.651	16.475182600000000000000000000000	99.553644600000000000000000000000	-trvj2p	QR	2026-02-10 10:03:02.598	16.475189200000000000000000000000	99.553645200000010000000000000000	-trvj2p	GPS	APPROVED	9.480000000000000000000000000000	1.480000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 23:33:15.306	2026-02-10 10:03:03.238	\N	\N	0.000000000000000000000000000000	\N
cmlfu3vjm000122th6qob3ydu	cml6cv8qd000113l7pz55vip3	2026-02-09 17:00:00	2026-02-10 00:00:00.5	16.455223100000000000000000000000	99.530079700000000000000000000000	-xgf12i	QR	2026-02-10 10:05:33.169	16.455251800000000000000000000000	99.530141700000000000000000000000	-xgf12i	GPS	APPROVED	9.080000000000000000000000000000	1.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-10 00:00:01.138	2026-02-10 10:05:34.455	\N	\N	0.000000000000000000000000000000	\N
cmlfrv8xz0003hpn4yl7vr32n	cml5g1xzx001oua47iy5u23oh	2026-02-09 17:00:00	2026-02-09 22:57:18.729	16.475163300000000000000000000000	99.553635200000000000000000000000	g3up74	QR	2026-02-10 11:00:47.826	16.475046200000000000000000000000	99.553568000000000000000000000000	g3up74	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 22:57:19.367	2026-02-10 11:00:48.476	\N	\N	0.000000000000000000000000000000	\N
cmlfqs1sz00011101njk9vxx2	cml6ctvgi000zuqrguiuyi2de	2026-02-09 17:00:00	2026-02-09 22:26:50.106	16.455106500000000000000000000000	99.530133500000010000000000000000	-1n18s4	QR	2026-02-10 04:31:20.13	16.455105800000000000000000000000	99.530089200000010000000000000000	hl88nd	GPS	APPROVED	5.070000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 22:26:50.531	2026-02-10 04:31:20.571	\N	\N	0.000000000000000000000000000000	\N
cmlftu2qa0003gmqsevipgmm8	cml6ctuwf0001uqrgn7ktp9je	2026-02-09 17:00:00	2026-02-09 23:52:23.219	16.436401600000000000000000000000	99.511910900000000000000000000000	4uyosu	QR	2026-02-10 10:02:23.358	16.436313200000000000000000000000	99.511870300000000000000000000000	4uyosu	GPS	APPROVED	9.170000000000000000000000000000	1.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 23:52:23.891	2026-02-10 10:02:24.637	\N	\N	0.000000000000000000000000000000	\N
cmlfqgy3p0001m1q3gpba39rz	cml5g1qzg000iua472zcpgugd	2026-02-09 17:00:00	2026-02-09 22:18:11.871	16.475281000000000000000000000000	99.553831400000010000000000000000	-8s2lny	QR	2026-02-10 10:30:34.545	16.475180700000000000000000000000	99.553641300000000000000000000000	-8s2lny	GPS	APPROVED	11.200000000000000000000000000000	3.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 22:18:12.517	2026-02-10 10:30:35.185	\N	\N	0.000000000000000000000000000000	2026-02-10 08:03:16.086
cmlg6ac7h00017zejfigogpdg	cml5cxygj0003v68ql9533bl3	2026-02-09 17:00:00	2026-02-10 05:40:57.63	16.475179300000000000000000000000	99.553639600000000000000000000000	-wfhbzg	QR	2026-02-15 05:41:13.785	16.475186100000000000000000000000	99.553623800000000000000000000000	-wfhbzg	GPS	APPROVED	119.000000000000000000000000000000	111.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 05:40:58.062	2026-02-15 05:41:14.224	\N	\N	0.000000000000000000000000000000	\N
cmlsyu6jx000186e4f7p32fv1	cml5g1xzx001oua47iy5u23oh	2026-02-18 17:00:00	2026-02-18 23:00:00	\N	\N	\N	MANUAL	2026-02-19 11:00:22.603	16.474432500000000000000000000000	99.553623700000000000000000000000	g3up74	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-19 04:33:25.96	2026-02-19 11:00:23.478	\N	\N	0.000000000000000000000000000000	2026-02-19 04:33:41.742
cmlfrxrcw0005hpn4uxtlgpy2	cml6ctvja0013uqrgbdjr4l0e	2026-02-09 17:00:00	2026-02-09 22:59:16.118	16.455092800000000000000000000000	99.530109100000000000000000000000	-xk7lgp	QR	2026-02-10 11:05:42.795	16.455104400000000000000000000000	99.530146900000010000000000000000	cs669g	GPS	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-10 07:06:39.341	2026-02-09 22:59:16.544	2026-02-10 11:05:43.226	92	2026-02-10 06:03:51.853	0.000000000000000000000000000000	2026-02-10 04:31:36.94
cmlg7c2i40003lx4lagjp9ryl	cml6ctv7w000juqrgh1tdiejn	2026-02-09 17:00:00	2026-02-10 06:10:00	16.436316600000000000000000000000	99.512034300000000000000000000000	rcqple	ADMIN_BACKFILL	2026-02-10 15:22:00	16.436244300000000000000000000000	99.512187900000000000000000000000	rcqple	ADMIN_BACKFILL	APPROVED	8.199999999999999000000000000000	0.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 06:10:18.412	2026-02-22 03:17:52.157	\N	\N	0.000000000000000000000000000000	\N
cmlfvkr0w000110ujqp90aqo0	cml5g1tky000wua47qqpf53wn	2026-02-10 00:00:00	2026-02-10 00:40:00	\N	\N	\N	MANUAL	2026-02-10 12:30:00	\N	\N	\N	MANUAL	APPROVED	10.830000000000000000000000000000	2.830000000000000000000000000000	100	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-10 03:03:18.43	2026-02-10 00:41:08.048	2026-02-10 12:35:10.646	\N	\N	0.000000000000000000000000000000	\N
cmlg6kth10001lx4l1qigs3ac	cml6ctvlp0017uqrgl43h68pm	2026-02-09 17:00:00	2026-02-10 05:49:06.55	16.455104700000000000000000000000	99.530098200000000000000000000000	-jkouny	QR	2026-02-10 14:02:18.688	16.454758800000000000000000000000	99.530182999999990000000000000000	-jkouny	GPS	APPROVED	7.220000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-10 06:06:48.728	2026-02-10 05:49:06.997	2026-02-10 14:02:19.11	\N	\N	0.000000000000000000000000000000	\N
cmlg6jibo00037zejfwtc3hkg	cml6ctveb000vuqrg3ulgugaj	2026-02-09 17:00:00	2026-02-10 05:48:05.444	16.455102500000000000000000000000	99.530117899999990000000000000000	-c3lq7g	QR	2026-02-10 14:24:24.895	16.455093800000000000000000000000	99.530158200000000000000000000000	i6qln2	GPS	APPROVED	7.600000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-10 06:06:26.476	2026-02-10 05:48:05.892	2026-02-10 14:24:25.784	\N	\N	0.000000000000000000000000000000	\N
cmlfyiifl000512va9n17c6nq	cml6ctvhm0011uqrgd2s6gv12	2026-02-10 00:00:00	2026-02-10 02:02:00	\N	\N	\N	MANUAL	2026-02-10 14:02:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-10 02:03:22.45	2026-02-10 22:36:59.974	\N	\N	0.000000000000000000000000000000	\N
cmlfybm7c000111de9tncf286	cml6ctvff000xuqrgvuiy6k2z	2026-02-10 00:00:00	2026-02-10 01:57:00	\N	\N	\N	MANUAL	2026-02-10 14:02:00	\N	\N	\N	MANUAL	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-10 01:58:00.744	2026-02-10 22:37:11.54	\N	\N	0.000000000000000000000000000000	\N
cmlfv3met0001bgs95yia6jtb	cml6ctvb9000puqrgafxo42i7	2026-02-09 17:00:00	2026-02-10 00:27:48.484	16.436336000000000000000000000000	99.511927500000000000000000000000	-xgf12i	QR	2026-02-10 12:26:15.847	16.436330900000000000000000000000	99.511943800000000000000000000000	-xgf12i	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 00:27:48.917	2026-02-11 00:23:23.321	\N	\N	0.000000000000000000000000000000	\N
cmlggu9wt0003r8mn8studn3i	cml6ctvz80021uqrghd4qf3t2	2026-02-09 17:00:00	2026-02-10 10:36:23.928	16.474981400000000000000000000000	99.553769800000000000000000000000	-erjiz0	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 10:36:24.365	2026-02-11 00:23:23.321	\N	\N	0.000000000000000000000000000000	\N
cmlh7bbvp000511shy6qe82ma	cml6ctvnx001buqrgfzjexn6r	2026-02-10 17:00:00	2026-02-10 22:57:29.458	16.455083300000000000000000000000	99.530080000000000000000000000000	-3nueuy	QR	2026-02-11 12:02:52.163	16.455107500000000000000000000000	99.529762700000010000000000000000	-3nueuy	GPS	APPROVED	12.080000000000000000000000000000	4.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 22:57:30.086	2026-02-11 12:02:52.825	\N	\N	0.000000000000000000000000000000	\N
cmlh6la0n000187pijil1qnk8	cml6ctvkk0015uqrg9iuy6dh1	2026-02-10 17:00:00	2026-02-10 22:37:14.182	16.454811652815680000000000000000	99.530341853510070000000000000000	phfpd5	QR	2026-02-11 06:33:50.345	16.454801689383050000000000000000	99.530347606778900000000000000000	phfpd5	GPS	APPROVED	6.930000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-10 22:37:34.961	2026-02-10 22:37:14.615	2026-02-11 06:33:50.801	\N	\N	0.000000000000000000000000000000	\N
cmlh7gh4j000711shfwthdqcl	cml5w8h240001ugxaadqh8irg	2026-02-10 17:00:00	2026-02-10 23:01:29.711	16.475028900000000000000000000000	99.553412499999990000000000000000	-zcd007	QR	2026-02-11 06:05:42.216	16.475180800000000000000000000000	99.553679600000000000000000000000	-zcd007	GPS	APPROVED	6.070000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:01:30.163	2026-02-11 06:05:43.049	\N	\N	0.000000000000000000000000000000	\N
cmlh7f8ml0001f7ksft6r67nl	cml6ctuzt0005uqrgdnihhrcg	2026-02-10 17:00:00	2026-02-10 23:00:32.061	16.436321200000000000000000000000	99.511893800000000000000000000000	-tvo3gw	QR	2026-02-11 05:18:50.178	16.436367300000000000000000000000	99.511824899999990000000000000000	-tvo3gw	GPS	APPROVED	5.300000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:00:32.493	2026-02-11 05:18:50.616	\N	\N	0.000000000000000000000000000000	\N
cmlh6hrc900031ho5h81v33hn	cml6ctveb000vuqrg3ulgugaj	2026-02-10 17:00:00	2026-02-10 22:34:29.991	16.455100100000000000000000000000	99.530114400000000000000000000000	-c3lq7g	QR	2026-02-11 05:51:35.711	16.455106500000000000000000000000	99.530198500000000000000000000000	i6qln2	GPS	APPROVED	6.280000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-10 22:37:30.286	2026-02-10 22:34:30.441	2026-02-11 05:51:36.151	\N	\N	0.000000000000000000000000000000	\N
cmlh7jay1000b11shqdvyx7nb	cml6ctv6r000huqrg08xd4xcm	2026-02-10 17:00:00	2026-02-10 23:03:41.695	16.436315166497580000000000000000	99.511849670571720000000000000000	579pd4	QR	2026-02-11 06:41:54.208	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	GPS	APPROVED	6.630000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:03:42.121	2026-02-11 06:41:54.656	\N	\N	0.000000000000000000000000000000	\N
cmlh9ev93000df7ksps8hhnn0	cml5waf57000114p7u4pb0j1l	2026-02-10 17:00:00	2026-02-10 23:56:13.753	16.475516500000000000000000000000	99.553840900000000000000000000000	4uyosu	GPS	2026-02-11 09:54:19.411	16.475519600000000000000000000000	99.553847600000000000000000000000	4uyosu	GPS	APPROVED	8.970000000000001000000000000000	0.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:56:14.392	2026-02-11 09:54:20.275	\N	\N	0.000000000000000000000000000000	\N
cmlh8fwb7000d11shv8jmgy7u	cml6cv8uy000713l7zocqn0fn	2026-02-10 17:00:00	2026-02-10 23:29:02.148	16.475162900000000000000000000000	99.553751400000000000000000000000	-trvj2p	QR	2026-02-11 10:07:17.506	16.475188400000000000000000000000	99.553653900000000000000000000000	-trvj2p	GPS	APPROVED	9.630000000000001000000000000000	1.630000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:29:02.803	2026-02-11 10:07:18.143	\N	\N	0.000000000000000000000000000000	\N
cmlh68yub00011ho52yvmonvy	cml6ctvgi000zuqrguiuyi2de	2026-02-10 17:00:00	2026-02-10 22:27:39.837	16.455097800000000000000000000000	99.530098800000000000000000000000	-1n18s4	QR	2026-02-11 10:37:13.497	16.455078000000000000000000000000	99.530116100000000000000000000000	hl88nd	GPS	APPROVED	11.150000000000000000000000000000	3.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-10 22:37:39.019	2026-02-10 22:27:40.259	2026-02-11 10:37:14.358	86	2026-02-11 04:28:48.987	0.000000000000000000000000000000	2026-02-11 03:02:04.59
cmlh9vfg3000ff7kszur50xyo	cml6ctvms0019uqrg4ft54y7j	2026-02-10 17:00:00	2026-02-11 00:09:06.627	16.455344100000000000000000000000	99.530246300000000000000000000000	-1n18s4	QR	2026-02-11 12:00:20.347	16.455024500000000000000000000000	99.530320000000000000000000000000	-tqfgt7	GPS	APPROVED	10.850000000000000000000000000000	2.850000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-11 00:09:07.06	2026-02-11 12:00:21.196	62	2026-02-11 06:02:21.699	0.000000000000000000000000000000	2026-02-11 05:00:21.108
cmliocrel000b2qdfkr9tou1j	cml6cv8uy000713l7zocqn0fn	2026-02-11 17:00:00	2026-02-11 23:42:15.872	16.475201000000000000000000000000	99.553633899999990000000000000000	-trvj2p	QR	2026-02-12 10:14:03.538	16.475589143118460000000000000000	99.553386277631330000000000000000	-a7615o	GPS	APPROVED	9.520000000000000000000000000000	1.520000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:42:16.51	2026-02-12 10:14:04.207	\N	\N	0.000000000000000000000000000000	\N
cmlitqb7i0001x8r669taodfv	cml6ctvff000xuqrgvuiy6k2z	2026-02-12 00:00:00	2026-02-12 02:00:00	\N	\N	\N	MANUAL	2026-02-12 13:59:00	\N	\N	\N	MANUAL	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-12 02:12:46.782	2026-02-12 14:00:18.379	\N	\N	0.000000000000000000000000000000	\N
cmlhm3kui000511plujvgvzl3	cml6ctvlp0017uqrgl43h68pm	2026-02-10 17:00:00	2026-02-11 05:51:22.271	16.455099300000000000000000000000	99.530098700000000000000000000000	-jkouny	QR	2026-02-11 14:02:55.378	16.454875400000000000000000000000	99.530201500000000000000000000000	-jkouny	GPS	APPROVED	7.180000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 05:51:22.698	2026-02-12 00:23:23.235	\N	\N	0.000000000000000000000000000000	\N
cmlhm31i1000311pl40q302ni	cml6ctvcw000tuqrgj8clzpzz	2026-02-10 17:00:00	2026-02-11 05:50:57.18	16.455169664711180000000000000000	99.530079737398340000000000000000	-oj16l7	QR	2026-02-11 14:04:11.739	16.455153822912940000000000000000	99.530144194233730000000000000000	-oj16l7	GPS	APPROVED	7.220000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 05:50:57.625	2026-02-12 00:23:23.235	\N	\N	0.000000000000000000000000000000	\N
cmlk6jwn3000311bs7a5ckfd0	cml6ctvp6001fuqrgjo0cut8g	2026-02-12 17:00:00	2026-02-13 00:59:28.488	16.455066000000000000000000000000	99.530091300000000000000000000000	-ilt8ll	QR	2026-02-13 10:04:05.085	16.454919300000000000000000000000	99.530032500000000000000000000000	luebtn	GPS	APPROVED	8.070000000000000000000000000000	0.070000000000000010000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-13 02:00:35.269	2026-02-13 00:59:29.151	2026-02-13 10:04:05.966	\N	\N	0.000000000000000000000000000000	\N
cmlimvyut00031203nppo7nsx	cml6ctv3c000buqrguslcci85	2026-02-11 17:00:00	2026-02-11 23:01:12.964	16.436268618613980000000000000000	99.511839094252490000000000000000	gg44cx	QR	2026-02-12 11:08:00	16.436515681025910000000000000000	99.511676129117480000000000000000	gg44cx	MANUAL	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:01:13.397	2026-02-21 03:18:38.558	62	2026-02-12 04:05:50.238	0.000000000000000000000000000000	2026-02-12 03:03:39.228
cmlhakbom000hf7ksh4v5z46f	cml6ctuyp0003uqrgejbtvcmm	2026-02-10 17:00:00	2026-02-11 00:28:28.14	16.436240600000000000000000000000	99.511882900000000000000000000000	-w9hfrz	QR	2026-02-11 12:28:15.215	16.436269200000000000000000000000	99.512073000000000000000000000000	-w9hfrz	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 00:28:28.583	2026-02-12 00:23:23.235	\N	\N	0.000000000000000000000000000000	\N
cmlhaodpk0001r3ax6f1ja0sb	cml6ctvrh001luqrg60imh1k9	2026-02-10 17:00:00	2026-02-11 00:31:36.987	16.475182500000000000000000000000	99.553624400000000000000000000000	-tvo3gw	GPS	2026-02-11 10:04:21.159	16.475199600000000000000000000000	99.553696599999990000000000000000	-tvo3gw	GPS	APPROVED	8.529999999999999000000000000000	0.530000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 00:31:37.621	2026-02-12 00:23:23.235	\N	\N	0.000000000000000000000000000000	\N
cmlhdjers0001ewiwphkjn5y8	cml5g22hz002gua47temxhj1t	2026-02-10 17:00:00	2026-02-11 01:51:43.524	16.475493200000000000000000000000	99.553863100000000000000000000000	ccsx7a	GPS	2026-02-11 13:55:09.179	16.475313400000000000000000000000	99.553792900000000000000000000000	ccsx7a	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 01:51:44.777	2026-02-12 00:23:23.235	83	2026-02-11 07:57:46.709	0.000000000000000000000000000000	2026-02-11 06:34:04.052
cmlhwlb4h000111kp2bkobv66	cml6ctvz80021uqrghd4qf3t2	2026-02-10 17:00:00	2026-02-11 10:45:05.218	16.475192000000000000000000000000	99.553703000000000000000000000000	-trvj2p	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 10:45:06.065	2026-02-12 00:23:23.235	\N	\N	0.000000000000000000000000000000	\N
cmlioqq7c000f1203qtnl07sl	cml6cv8sm000313l7yhueq5zy	2026-02-11 17:00:00	2026-02-11 23:53:07.493	16.455080200000000000000000000000	99.530116400000000000000000000000	-oka4kb	QR	2026-02-14 10:02:02.052	16.455041000000000000000000000000	99.530136400000000000000000000000	jl0pv7	GPS	REJECTED	57.130000000000000000000000000000	49.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	cml6ctveb000vuqrg3ulgugaj	2026-02-12 22:35:53.958	2026-02-11 23:53:08.137	2026-02-14 10:02:02.482	\N	\N	0.000000000000000000000000000000	\N
cmlip76gs000h1203ifjz306t	cml6cv8qd000113l7pz55vip3	2026-02-11 17:00:00	2026-02-12 00:05:55.01	16.455175500000000000000000000000	99.530172400000000000000000000000	-xgf12i	QR	2026-02-14 10:32:06.685	16.455188800000000000000000000000	99.529770000000000000000000000000	-xgf12i	GPS	APPROVED	57.430000000000000000000000000000	49.430000000000000000000000000000	5	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-12 00:05:55.709	2026-02-14 10:32:07.342	\N	\N	0.000000000000000000000000000000	\N
cmlhbor020007r3ax3jg5cirx	cml5g289u003uua47ulssk26x	2026-02-10 17:00:00	2026-02-11 00:59:54.045	16.475443800000000000000000000000	99.553816200000000000000000000000	ktr8uu	QR	2026-02-11 13:00:09.271	16.475073700000000000000000000000	99.553590700000000000000000000000	ktr8uu	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 00:59:54.675	2026-02-12 00:23:23.235	90	2026-02-11 06:30:52.294	0.000000000000000000000000000000	2026-02-11 05:00:01.854
cmlhg1s7t00011jce6cnb6whb	cml6ctvwy001xuqrgl2hwd8y1	2026-02-10 17:00:00	2026-02-10 22:30:00	16.475301300000000000000000000000	99.553896300000010000000000000000	-wfhbzg	ADMIN_EDIT	2026-02-11 10:36:12.697	16.475197700000000000000000000000	99.553689600000000000000000000000	-wfhbzg	GPS	APPROVED	12.103526944444440000000000000000	0.000000000000000000000000000000	272	\N	250.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 03:02:01.241	2026-02-21 03:26:52.347	84	2026-02-11 04:27:51.606	0.000000000000000000000000000000	2026-02-11 03:03:15.842
cmlhl58xn0001z63ggu7q9zl3	cml5g1vmh001aua47rlxc2pr1	2026-02-10 17:00:00	2026-02-11 05:24:39.685	16.475398200000000000000000000000	99.553900300000000000000000000000	2hlpr1	GPS	2026-02-11 11:30:52.811	16.475299300000000000000000000000	99.553863800000000000000000000000	2hlpr1	GPS	APPROVED	5.100000000000000000000000000000	0.000000000000000000000000000000	354	\N	300.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 05:24:40.956	2026-02-12 00:23:23.235	\N	\N	0.000000000000000000000000000000	\N
cmlin0ymn00071203yulga0bh	cml6ctv6r000huqrg08xd4xcm	2026-02-11 17:00:00	2026-02-11 23:05:00	16.436330227865710000000000000000	99.511856981083530000000000000000	579pd4	ADMIN_BACKFILL	2026-02-12 06:25:00	16.436220748556560000000000000000	99.511674099024650000000000000000	579pd4	ADMIN_BACKFILL	APPROVED	6.330000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:05:06.383	2026-02-21 06:01:32.778	\N	\N	0.000000000000000000000000000000	\N
cmlilmp7o0001e7do8dh8ss39	cml5g1qzg000iua472zcpgugd	2026-02-11 17:00:00	2026-02-11 22:26:00.729	16.475201900000000000000000000000	99.553734700000010000000000000000	-8s2lny	QR	2026-02-12 10:38:31.091	16.475450900000000000000000000000	99.553811300000010000000000000000	-8s2lny	GPS	APPROVED	11.200000000000000000000000000000	3.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 22:26:01.38	2026-02-12 10:38:31.76	87	2026-02-12 06:28:53.48	0.000000000000000000000000000000	2026-02-12 05:01:48.046
cmlio1vu000091203c0m089a0	cml5g1vmh001aua47rlxc2pr1	2026-02-11 17:00:00	2026-02-11 23:33:48.396	16.475191200000000000000000000000	99.553677200000000000000000000000	2hlpr1	GPS	2026-02-12 11:30:25.596	16.475231900000000000000000000000	99.553683500000010000000000000000	2hlpr1	GPS	APPROVED	10.930000000000000000000000000000	2.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:33:49.032	2026-02-12 11:30:26.976	\N	\N	0.000000000000000000000000000000	2026-02-12 05:35:21.187
cmlimth1000052qdfk7qvypvo	cml6ctvnx001buqrgfzjexn6r	2026-02-11 17:00:00	2026-02-11 22:59:16.341	16.455064400000000000000000000000	99.530129700000000000000000000000	-3nueuy	QR	2026-02-12 12:04:55.367	16.455056500000000000000000000000	99.529757500000000000000000000000	-3nueuy	GPS	APPROVED	12.080000000000000000000000000000	4.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 22:59:16.981	2026-02-12 12:04:56.017	\N	\N	0.000000000000000000000000000000	\N
cmlimxv7w00051203incqgdpm	cml6ctvja0013uqrgbdjr4l0e	2026-02-11 17:00:00	2026-02-11 23:02:41.572	16.455088800000000000000000000000	99.530104300000000000000000000000	-xk7lgp	QR	2026-02-12 11:02:13.305	16.455065200000000000000000000000	99.529996200000000000000000000000	cs669g	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:02:41.996	2026-02-12 11:02:13.741	88	2026-02-12 07:00:37.803	0.000000000000000000000000000000	2026-02-12 05:32:25.624
cmlimufl100092qdfs6qhvg8n	cml5w8h240001ugxaadqh8irg	2026-02-11 17:00:00	2026-02-11 23:00:01.337	16.475051600000000000000000000000	99.553115000000010000000000000000	-zcd007	QR	2026-02-12 07:03:56.794	16.475217900000000000000000000000	99.553451400000000000000000000000	-zcd007	GPS	APPROVED	7.050000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:00:01.766	2026-02-12 07:03:57.223	\N	\N	0.000000000000000000000000000000	\N
cmlioxmsz000h2qdftgh5fltv	cml6ctvtp001puqrgr6j1clm9	2026-02-11 17:00:00	2026-02-11 23:58:29.896	16.475222700000000000000000000000	99.553770400000000000000000000000	4zl33m	QR	2026-02-12 09:54:12.993	16.475473000000000000000000000000	99.553751199999990000000000000000	4zl33m	GPS	APPROVED	8.920000000000000000000000000000	0.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:58:30.323	2026-02-12 09:54:13.459	\N	\N	0.000000000000000000000000000000	\N
cmliot0dh000f2qdfabd3p4dm	cml6ctvsk001nuqrgooayfxde	2026-02-11 17:00:00	2026-02-11 23:54:53.34	16.475290100000000000000000000000	99.553838300000000000000000000000	-xk7lgp	GPS	2026-02-12 09:56:46.378	16.475513500000000000000000000000	99.553856999999990000000000000000	-xk7lgp	GPS	APPROVED	9.020000000000000000000000000000	1.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:54:54.629	2026-02-12 09:56:47.051	\N	\N	0.000000000000000000000000000000	\N
cmliocxzt000d2qdfc0mfzcyi	cml6cv8ts000513l7uydg8j16	2026-02-11 17:00:00	2026-02-11 23:42:24.613	16.475338200000000000000000000000	99.553653299999990000000000000000	-p0zg9d	QR	2026-02-12 10:16:25.49	16.475243100000000000000000000000	99.553641900000000000000000000000	-p0zg9d	GPS	APPROVED	9.570000000000000000000000000000	1.570000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:42:25.049	2026-02-12 10:16:26.431	\N	\N	0.000000000000000000000000000000	\N
cmlilq44v00012qdfgb7ajz4l	cml6ctvgi000zuqrguiuyi2de	2026-02-11 17:00:00	2026-02-11 22:28:40.232	16.455086900000000000000000000000	99.530117700000010000000000000000	-1n18s4	QR	2026-02-12 10:31:06.06	16.455070500000000000000000000000	99.530105600000000000000000000000	hl88nd	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 22:28:40.687	2026-02-12 10:31:06.493	88	2026-02-12 04:29:22.019	0.000000000000000000000000000000	2026-02-12 03:01:07.508
cmlhzdoj000031337ax4xy4zn	cml6ctva5000nuqrg8wh05sro	2026-02-10 17:00:00	2026-02-11 12:03:08.599	16.436162200000000000000000000000	99.512093600000000000000000000000	l62qcv	QR	2026-02-14 12:12:50.385	16.436172700000000000000000000000	99.512073500000000000000000000000	4zl33m	GPS	APPROVED	71.150000000000010000000000000000	63.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 12:03:09.036	2026-02-14 12:12:50.815	\N	\N	0.000000000000000000000000000000	\N
cmlk1cqgn00012a1rwnlis6as	cml6ctveb000vuqrg3ulgugaj	2026-02-12 17:00:00	2026-02-12 22:33:55.558	16.455086500000000000000000000000	99.530112300000000000000000000000	-c3lq7g	QR	2026-02-13 05:45:55.961	16.455095600000000000000000000000	99.530145500000000000000000000000	jnfchk	GPS	APPROVED	6.200000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-12 22:36:18.048	2026-02-12 22:33:56.471	2026-02-13 05:45:56.836	\N	\N	0.000000000000000000000000000000	\N
cmlk14ma80001clcxelpd0iop	cml6ctvgi000zuqrguiuyi2de	2026-02-12 17:00:00	2026-02-12 22:27:37.168	16.455089800000000000000000000000	99.530131999999990000000000000000	-1n18s4	QR	2026-02-13 10:34:24.628	16.455083200000000000000000000000	99.530124300000000000000000000000	hl88nd	GPS	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-12 22:36:21.651	2026-02-12 22:27:37.808	2026-02-13 10:34:25.285	87	2026-02-13 04:29:08.867	0.000000000000000000000000000000	2026-02-13 03:01:33.027
cmlk1hwfq0001ucrigwthaulo	cml6ctvff000xuqrgvuiy6k2z	2026-02-13 00:00:00	2026-02-13 02:00:00	\N	\N	\N	MANUAL	2026-02-13 13:58:00	\N	\N	\N	MANUAL	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-12 22:37:57.494	2026-02-13 13:58:28.427	\N	\N	0.000000000000000000000000000000	\N
cmlhut1rg0001ool4b9wl2ezl	cml6ctvsk001nuqrgooayfxde	2026-02-10 17:00:00	2026-02-11 09:55:07.089	16.475409400000000000000000000000	99.553782000000000000000000000000	-xk7lgp	GPS	2026-02-13 23:59:55.256	16.475142200000000000000000000000	99.553743500000000000000000000000	-xk7lgp	GPS	APPROVED	61.070000000000000000000000000000	53.070000000000000000000000000000	535	\N	450.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 09:55:07.948	2026-02-13 23:59:55.934	\N	\N	0.000000000000000000000000000000	\N
cmlkpwmju00013md0y7vgead4	cml6ctvrh001luqrg60imh1k9	2026-02-12 17:00:00	2026-02-13 00:30:00	16.475181700000000000000000000000	99.553616700000010000000000000000	-tvo3gw	ADMIN_EDIT	2026-02-13 10:02:16.763	16.475168500000000000000000000000	99.553618500000000000000000000000	-tvo3gw	GPS	APPROVED	9.537989722222223000000000000000	0.000000000000000000000000000000	541	\N	500.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 10:01:15.306	2026-02-14 00:24:56.285	\N	\N	0.000000000000000000000000000000	\N
cmlitbf410001fzh85swy92lw	cml5g1tky000wua47qqpf53wn	2026-02-12 00:00:00	2026-02-12 00:30:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-12 02:01:12.001	2026-02-12 02:01:12.001	\N	\N	0.000000000000000000000000000000	\N
cmla79pk00001usgqdqlwbo52	cml6ctvp6001fuqrgjo0cut8g	2026-02-05 17:00:00	2026-02-06 01:00:00	\N	\N	\N	MANUAL	2026-02-14 00:55:18.168	16.455106100000000000000000000000	99.530120800000010000000000000000	luebtn	GPS	APPROVED	190.920000000000000000000000000000	182.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 10:03:13.648	2026-02-06 01:21:51.264	2026-02-14 00:55:18.595	0	2026-02-06 10:03:26.762	0.000000000000000000000000000000	2026-02-06 10:03:19.431
cmlllewy20001i4u9oltyu6ws	cml6cv8w4000913l7imruilgz	2026-02-14 00:00:00	2026-02-14 00:30:00	\N	\N	\N	MANUAL	2026-02-14 10:02:22.189	16.475191400000000000000000000000	99.553836700000010000000000000000	-x7wv4j	GPS	APPROVED	8.529999999999999000000000000000	0.530000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-14 00:43:16.682	2026-02-14 10:02:22.619	\N	\N	0.000000000000000000000000000000	\N
cmlllokh50005i4u90nxrxeoq	cml5g20im0022ua4780xu5bou	2026-02-14 00:00:00	2026-02-13 22:30:00	\N	\N	\N	MANUAL	2026-02-14 10:30:32.838	16.475175300000000000000000000000	99.553825100000000000000000000000	-nselrn	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml5w8h240001ugxaadqh8irg	2026-02-14 04:35:48.888	2026-02-14 00:50:47.081	2026-02-14 10:30:33.488	\N	\N	0.000000000000000000000000000000	\N
cmliodngo000b1203uw8834fb	cml6ctvms0019uqrg4ft54y7j	2026-02-11 17:00:00	2026-02-11 23:42:57.623	16.455097900000000000000000000000	99.530102900000000000000000000000	-1n18s4	QR	2026-02-12 12:01:20.561	16.454979600000000000000000000000	99.529891000000010000000000000000	-tqfgt7	GPS	APPROVED	11.300000000000000000000000000000	3.300000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:42:58.056	2026-02-12 12:01:21.463	58	2026-02-12 05:58:44.899	0.000000000000000000000000000000	2026-02-12 05:00:06.149
cmllllx1d0003i4u96xj4rxux	cml5g1vmh001aua47rlxc2pr1	2026-02-14 00:00:00	2026-02-13 23:00:00	\N	\N	\N	MANUAL	2026-02-14 11:01:02.124	16.475189500000000000000000000000	99.553690600000000000000000000000	2hlpr1	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml5w8h240001ugxaadqh8irg	2026-02-14 04:37:58.673	2026-02-14 00:48:43.393	2026-02-14 11:01:02.763	\N	\N	0.000000000000000000000000000000	\N
cmllhuunh000d3r6qlvueopk0	cml6ctvja0013uqrgbdjr4l0e	2026-02-13 17:00:00	2026-02-13 23:03:41.093	16.455051700000000000000000000000	99.530124900000000000000000000000	-xk7lgp	QR	2026-02-14 11:10:23.725	16.455042300000000000000000000000	99.530185800000000000000000000000	-cvmrg6	GPS	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 23:03:41.742	2026-02-14 11:10:24.157	89	2026-02-14 06:01:02.126	0.000000000000000000000000000000	2026-02-14 04:31:30.676
cmlk2nymi000310au1tefxp2f	cml6ctv4g000duqrgdybgtyte	2026-02-12 17:00:00	2026-02-13 11:10:00	16.436161000000000000000000000000	99.511902100000000000000000000000	7uvltx	ADMIN_EDIT	2026-02-14 23:08:12.069	16.436291900000000000000000000000	99.511973600000000000000000000000	7uvltx	GPS	APPROVED	34.970000000000000000000000000000	26.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:10:39.882	2026-02-14 23:08:13.321	0	2026-02-13 15:08:48.138	0.000000000000000000000000000000	2026-02-13 15:08:25.768
cmlimqrt800011203exmo5bh8	cml5g1xzx001oua47iy5u23oh	2026-02-11 17:00:00	2026-02-11 22:57:10.342	16.475193200000000000000000000000	99.553395900000000000000000000000	g3up74	QR	2026-02-12 11:01:31.787	16.475184700000000000000000000000	99.553645500000000000000000000000	g3up74	GPS	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 22:57:10.989	2026-02-12 11:01:32.458	\N	\N	0.000000000000000000000000000000	2026-02-12 03:00:36.786
cmlimtkz000072qdfwgdb7x01	cml6ctuzt0005uqrgdnihhrcg	2026-02-11 17:00:00	2026-02-11 22:59:20.386	16.436323400000000000000000000000	99.511872600000000000000000000000	-tvo3gw	QR	2026-02-12 11:09:09.776	16.436268500000000000000000000000	99.511954700000000000000000000000	-tvo3gw	GPS	APPROVED	11.150000000000000000000000000000	3.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 22:59:20.813	2026-02-12 11:09:10.205	60	2026-02-12 06:12:03.186	0.000000000000000000000000000000	2026-02-12 05:11:16.146
cmlj2bfoa000311e4lxe7rtj2	cml6ctveb000vuqrg3ulgugaj	2026-02-11 17:00:00	2026-02-12 06:13:08.847	16.455088900000000000000000000000	99.529920800000000000000000000000	-c3lq7g	QR	2026-02-12 14:00:53.99	16.455091600000000000000000000000	99.530101300000000000000000000000	i6qln2	GPS	APPROVED	6.780000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-12 10:05:59.049	2026-02-12 06:13:09.275	2026-02-12 14:00:54.643	\N	\N	0.000000000000000000000000000000	\N
cmlj1fu59000111e4zfha6exb	cml6ctvlp0017uqrgl43h68pm	2026-02-11 17:00:00	2026-02-12 05:48:34.615	16.455067400000000000000000000000	99.530100800000000000000000000000	-jkouny	QR	2026-02-12 14:02:42.201	16.454774200000000000000000000000	99.530179399999990000000000000000	-hp1zn2	GPS	APPROVED	7.230000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-12 10:06:07.252	2026-02-12 05:48:35.037	2026-02-12 14:02:42.637	\N	\N	0.000000000000000000000000000000	\N
cmljalw000003137kagi917uo	cml6cv8sm000313l7yhueq5zy	2026-02-12 00:00:00	2026-02-12 00:00:00	\N	\N	\N	MANUAL	2026-02-12 10:02:00	\N	\N	\N	MANUAL	APPROVED	9.029999999999999000000000000000	1.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-12 22:35:47.489	2026-02-12 10:05:13.92	2026-02-12 22:35:47.49	\N	\N	0.000000000000000000000000000000	\N
cmllwa0810005wr0jp0z986on	cml6ctvlp0017uqrgl43h68pm	2026-02-13 17:00:00	2026-02-14 05:47:22.998	16.455094100000000000000000000000	99.530084300000000000000000000000	-jkouny	QR	2026-02-14 14:01:34.938	16.454821700000000000000000000000	99.530085099999990000000000000000	-jkouny	GPS	APPROVED	7.230000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 05:47:23.425	2026-02-15 00:13:35.339	\N	\N	0.000000000000000000000000000000	\N
cmlmycq6o0001zcd4qr2fg3xf	cml5g1vmh001aua47rlxc2pr1	2026-02-14 17:00:00	2026-02-14 23:33:14.749	16.475256900000000000000000000000	99.553673300000000000000000000000	2hlpr1	QR	2026-02-15 11:31:35.236	16.475187100000000000000000000000	99.553636900000000000000000000000	2hlpr1	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 23:33:15.793	2026-02-15 11:31:36.093	101	2026-02-15 04:42:05.344	28.916666666666670000000000000000	2026-02-15 03:00:34.393
cmlmw3jxd0005v1y1ta7ez4qv	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 17:00:00	2026-02-14 22:30:07.907	16.454831608107630000000000000000	99.530339295238120000000000000000	phfpd5	QR	2026-02-15 06:52:03.103	16.454862771438180000000000000000	99.530327507207020000000000000000	phfpd5	GPS	APPROVED	7.350000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-14 22:35:35.725	2026-02-14 22:30:08.545	2026-02-15 06:52:03.765	\N	\N	0.000000000000000000000000000000	\N
cmlmx2xe20003dd6xmuu6ry6h	cml6ctvnx001buqrgfzjexn6r	2026-02-14 17:00:00	2026-02-14 22:57:37.235	16.455071800000000000000000000000	99.530157700000000000000000000000	-3nueuy	GPS	2026-02-15 12:15:18.363	16.455122900000000000000000000000	99.529751700000010000000000000000	-3nueuy	GPS	APPROVED	12.280000000000000000000000000000	4.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-14 23:32:09.326	2026-02-14 22:57:38.954	2026-02-15 12:15:19.22	\N	\N	0.000000000000000000000000000000	\N
cmlmx9mp60001vk9yk9gasky7	cml6ctvja0013uqrgbdjr4l0e	2026-02-14 17:00:00	2026-02-14 23:02:51.046	16.455023400000000000000000000000	99.530146500000000000000000000000	-xk7lgp	QR	2026-02-15 11:15:56.276	16.455092900000000000000000000000	99.530157700000000000000000000000	-cvmrg6	GPS	APPROVED	11.220000000000000000000000000000	3.220000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-14 23:31:59.863	2026-02-14 23:02:51.69	2026-02-15 11:15:56.921	88	2026-02-15 06:00:16.33	0.000000000000000000000000000000	2026-02-15 04:31:45.38
cmlipy0a90003dhmtc7lhafp7	cml6ctvb9000puqrgafxo42i7	2026-02-11 17:00:00	2026-02-12 00:26:46.977	16.436243800000000000000000000000	99.512166400000000000000000000000	-xgf12i	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 00:26:47.409	2026-02-13 00:40:02.308	\N	\N	0.000000000000000000000000000000	\N
cmlmxr1sf000fv1y12yrcca2d	cml6ctv270009uqrg7spxr9d4	2026-02-14 17:00:00	2026-02-14 23:16:23.731	16.436426700000000000000000000000	99.511855000000000000000000000000	4uyosu	QR	2026-02-15 11:09:56.85	16.436362700000000000000000000000	99.511810600000000000000000000000	4uyosu	GPS	APPROVED	10.880000000000000000000000000000	2.880000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-14 23:31:51.266	2026-02-14 23:16:24.399	2026-02-15 11:09:57.53	0	2026-02-15 06:12:28.558	0.000000000000000000000000000000	2026-02-15 06:12:08.227
cmln0nae0000968gjcw5gmc48	cml6ctuyp0003uqrgejbtvcmm	2026-02-14 17:00:00	2026-02-15 00:37:27.131	16.436408000000000000000000000000	99.511804100000010000000000000000	-w9hfrz	QR	2026-02-15 12:38:14.317	16.436356400000000000000000000000	99.511852700000010000000000000000	-w9hfrz	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 00:37:27.768	2026-02-16 00:12:25.331	\N	\N	0.000000000000000000000000000000	\N
cmlofrx160003woo4kbmity0s	cml6ctva5000nuqrg8wh05sro	2026-02-15 17:00:00	2026-02-16 00:28:43.519	16.436261800000000000000000000000	99.511996800000010000000000000000	4zl33m	QR	2026-02-16 12:28:03.629	16.436164100000000000000000000000	99.512087500000010000000000000000	4zl33m	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 00:28:44.154	2026-02-17 00:31:59.272	\N	\N	0.000000000000000000000000000000	\N
cmlk1nwgw0003ucrifbln7ltt	cml6ctvkk0015uqrg9iuy6dh1	2026-02-12 17:00:00	2026-02-12 22:42:36.8	16.455170041896820000000000000000	99.530057692993000000000000000000	phfpd5	QR	2026-02-13 06:37:46.643	16.455287018004170000000000000000	99.530143358897040000000000000000	phfpd5	GPS	APPROVED	6.920000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 22:42:37.472	2026-02-13 06:37:47.823	\N	\N	0.000000000000000000000000000000	\N
cmliqdy24000bdhmtdfhxhc46	cml6cv8w4000913l7imruilgz	2026-02-11 17:00:00	2026-02-12 00:39:10.592	16.475327300000000000000000000000	99.553818900000000000000000000000	-7x56ss	QR	2026-02-12 10:07:06.391	16.475195900000000000000000000000	99.553702100000000000000000000000	-7x56ss	QR	APPROVED	8.465499722222223000000000000000	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 00:39:11.02	2026-02-13 08:47:28.692	\N	\N	0.000000000000000000000000000000	\N
cmlk0pzkr000173cqcc4k1ybo	cml5g1qzg000iua472zcpgugd	2026-02-12 17:00:00	2026-02-12 22:16:14.108	16.475174200000000000000000000000	99.553743999999990000000000000000	-8s2lny	QR	2026-02-13 10:33:11.33	16.475159600000000000000000000000	99.553585000000000000000000000000	-8s2lny	GPS	APPROVED	11.270000000000000000000000000000	3.270000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 22:16:15.195	2026-02-13 10:33:12.602	87	2026-02-13 04:36:33.099	0.000000000000000000000000000000	2026-02-13 03:08:33.817
cmlk23bmb0001g9i8tjk3a7p8	cml6ctvnx001buqrgfzjexn6r	2026-02-12 17:00:00	2026-02-12 22:54:35.811	16.455083300000000000000000000000	99.530109999999990000000000000000	e1wb71	GPS	2026-02-13 12:22:42.309	16.455118600000000000000000000000	99.529742200000000000000000000000	-3nueuy	GPS	APPROVED	12.470000000000000000000000000000	4.470000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 22:54:36.947	2026-02-13 12:22:43.386	\N	\N	0.000000000000000000000000000000	\N
cmloiq7re0001yk8dskqsu1cl	cml5g22hz002gua47temxhj1t	2026-02-15 17:00:00	2026-02-16 01:51:21.816	16.475182600000000000000000000000	99.553661899999990000000000000000	8dlb91	GPS	2026-02-16 13:58:00.649	16.475187700000000000000000000000	99.553641400000000000000000000000	8dlb91	GPS	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 01:51:23.595	2026-02-17 00:31:59.272	81	2026-02-16 07:27:19.515	0.000000000000000000000000000000	2026-02-16 06:06:06.01
cmlk28rvo0003g9i8xak5ppn0	cml5g1xzx001oua47iy5u23oh	2026-02-12 17:00:00	2026-02-12 22:58:00	16.475184300000000000000000000000	99.553643900000000000000000000000	g3up74	ADMIN_BACKFILL	2026-02-13 06:00:00	16.475247700000000000000000000000	99.553841800000000000000000000000	g3up74	ADMIN_BACKFILL	APPROVED	6.030000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 22:58:51.3	2026-02-22 03:33:07.808	\N	\N	0.000000000000000000000000000000	\N
cmljcyhe10003dr2u824qu4l8	cml6ctv5n000fuqrg94t826wg	2026-02-11 17:00:00	2026-02-12 11:11:00.082	16.436272300000000000000000000000	99.512128899999990000000000000000	jzx37b	QR	2026-02-13 23:08:51.794	16.436215500000000000000000000000	99.512116300000000000000000000000	jzx37b	GPS	APPROVED	34.950000000000000000000000000000	26.950000000000000000000000000000	11	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 11:11:00.745	2026-02-13 23:08:52.424	36	2026-02-12 16:03:40.338	0.000000000000000000000000000000	2026-02-12 15:26:52.9
cmliq129y0001peerntfhvog7	cml6ctuyp0003uqrgejbtvcmm	2026-02-11 17:00:00	2026-02-12 00:29:09.533	16.436225200000000000000000000000	99.512132500000010000000000000000	-w9hfrz	QR	2026-02-12 12:29:55.444	16.436301000000000000000000000000	99.511995900000000000000000000000	-w9hfrz	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 00:29:09.959	2026-02-13 00:40:02.308	\N	\N	0.000000000000000000000000000000	\N
cmliq5w0w0007dhmte9tgtkjn	cml5waf57000114p7u4pb0j1l	2026-02-11 17:00:00	2026-02-12 00:32:54.483	16.475325900000000000000000000000	99.553724600000000000000000000000	4uyosu	GPS	2026-02-12 09:53:23.987	16.475533900000000000000000000000	99.553840900000000000000000000000	4uyosu	GPS	APPROVED	8.330000000000000000000000000000	0.330000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 00:32:55.136	2026-02-13 00:40:02.308	\N	\N	0.000000000000000000000000000000	\N
cmliq6bnb0009dhmtc3fbxiwj	cml6ctvrh001luqrg60imh1k9	2026-02-11 17:00:00	2026-02-12 00:33:14.73	16.475138600000000000000000000000	99.553628800000000000000000000000	-tvo3gw	GPS	2026-02-12 10:36:43.282	16.475188000000000000000000000000	99.553649699999990000000000000000	-tvo3gw	GPS	APPROVED	9.050000000000001000000000000000	1.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 00:33:15.383	2026-02-13 00:40:02.308	\N	\N	0.000000000000000000000000000000	\N
cmliqgqc6000ddhmtg5m4axzu	cml6ctvqa001huqrgn8fa8qe5	2026-02-11 17:00:00	2026-02-12 00:41:20.556	16.455112100000000000000000000000	99.530159100000010000000000000000	g3up74	QR	2026-02-12 10:20:16.099	16.454960300000000000000000000000	99.530131999999990000000000000000	-hp1zn2	GPS	APPROVED	8.630000000000001000000000000000	0.630000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 00:41:20.982	2026-02-13 00:40:02.308	\N	\N	0.000000000000000000000000000000	\N
cmliqs4fg000fdhmtmpd3nkh1	cml6ctvp6001fuqrgjo0cut8g	2026-02-11 17:00:00	2026-02-12 00:50:12.027	16.455088000000000000000000000000	99.530115499999990000000000000000	-ilt8ll	QR	2026-02-12 10:18:24.448	16.454960300000000000000000000000	99.530131999999990000000000000000	-hp1zn2	GPS	APPROVED	8.470000000000001000000000000000	0.470000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 00:50:12.46	2026-02-13 00:40:02.308	\N	\N	0.000000000000000000000000000000	\N
cmlit31xp0001er3ndwzzeaan	cml5g22hz002gua47temxhj1t	2026-02-11 17:00:00	2026-02-12 01:54:41.025	16.475199900000000000000000000000	99.553689300000000000000000000000	ccsx7a	GPS	2026-02-12 14:05:00.337	16.475182900000000000000000000000	99.553647000000000000000000000000	ccsx7a	GPS	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 01:54:41.677	2026-02-13 00:40:02.308	86	2026-02-12 08:00:34.471	0.000000000000000000000000000000	2026-02-12 06:33:53.344
cmlit9ibw0003er3npbv3meza	cml6ctvhm0011uqrgd2s6gv12	2026-02-11 17:00:00	2026-02-12 01:59:42.438	16.455100500000000000000000000000	99.530142700000000000000000000000	-8w3vna	QR	2026-02-12 14:00:23.889	16.455082300000000000000000000000	99.530142799999990000000000000000	4uyosu	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 01:59:42.86	2026-02-13 00:40:02.308	89	2026-02-12 09:01:44.747	0.000000000000000000000000000000	2026-02-12 07:32:28.849
cmlhx5c7b00011337cz30zrm2	cml6ctv5n000fuqrg94t826wg	2026-02-10 17:00:00	2026-02-11 11:00:39.936	16.436417700000000000000000000000	99.511918499999990000000000000000	jzx37b	QR	2026-02-13 23:09:13.341	16.436225100000000000000000000000	99.512027700000000000000000000000	jzx37b	GPS	APPROVED	59.130000000000000000000000000000	51.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 11:00:40.584	2026-02-13 23:09:13.97	24	2026-02-11 15:42:29.667	0.000000000000000000000000000000	2026-02-11 15:18:26.63
cml9i37bn0001ei1qgncm7dbk	cml6ctvms0019uqrg4ft54y7j	2026-02-05 00:00:00	2026-02-05 13:36:56.877	16.455093600000000000000000000000	99.530140200000010000000000000000	-1n18s4	QR	2026-02-13 23:49:21.638	16.454992000000000000000000000000	99.529762700000010000000000000000	-tqfgt7	GPS	APPROVED	201.200000000000000000000000000000	193.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 13:36:57.299	2026-02-13 23:49:22.07	\N	\N	0.000000000000000000000000000000	\N
cmllgpoke0003ip9yi1nad9qa	cml6ctvgi000zuqrguiuyi2de	2026-02-14 00:00:00	2026-02-13 22:30:00	\N	\N	\N	MANUAL	2026-02-14 10:33:44.778	16.455093700000000000000000000000	99.530125900000000000000000000000	hl88nd	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-13 22:31:40.958	2026-02-14 10:33:45.213	\N	\N	0.000000000000000000000000000000	\N
cmliq3kek0005dhmtcdinjqtn	cml6ctva5000nuqrg8wh05sro	2026-02-11 17:00:00	2026-02-12 00:31:06.344	16.436222100000000000000000000000	99.512007100000010000000000000000	4zl33m	QR	2026-02-14 12:12:41.085	16.436277600000000000000000000000	99.511900999999990000000000000000	4zl33m	GPS	APPROVED	58.680000000000000000000000000000	50.680000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 00:31:06.764	2026-02-14 12:12:41.942	\N	\N	0.000000000000000000000000000000	\N
cmllo7ba60001gpn7ubrvaqlz	cml6ctvff000xuqrgvuiy6k2z	2026-02-14 00:00:00	2026-02-14 01:59:00	\N	\N	\N	MANUAL	2026-02-14 14:04:00	\N	\N	\N	MANUAL	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-14 02:01:20.862	2026-02-14 14:05:08.882	\N	\N	0.000000000000000000000000000000	\N
cmllk9fdb0001659xzbxsn0td	cml6ctv0x0007uqrgprf5lu7c	2026-02-13 17:00:00	2026-02-14 00:11:00.377	16.436387488159200000000000000000	99.511782544061870000000000000000	-85vz5c	QR	2026-02-14 12:11:22.978	16.436387488159200000000000000000	99.511782544061870000000000000000	-85vz5c	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-14 00:11:01.008	2026-02-14 12:11:23.409	63	2026-02-14 06:06:24.175	0.000000000000000000000000000000	2026-02-14 05:02:39.817
cmlj1e1pf0001etuh0r68azrr	cml5cxygj0003v68ql9533bl3	2026-02-11 17:00:00	2026-02-12 05:47:11.099	16.475196600000000000000000000000	99.553634800000000000000000000000	-wfhbzg	QR	2026-02-15 05:40:41.632	16.475188200000000000000000000000	99.553636700000000000000000000000	-wfhbzg	GPS	APPROVED	70.880000000000000000000000000000	62.880000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 05:47:11.523	2026-02-15 05:40:42.07	\N	\N	0.000000000000000000000000000000	\N
cmlllb18w00039gk0vfmha8p7	cml5g1xzx001oua47iy5u23oh	2026-02-14 00:00:00	2026-02-13 23:30:00	\N	\N	\N	MANUAL	2026-02-14 22:52:16.592	16.475124400000000000000000000000	99.553685400000010000000000000000	g3up74	GPS	APPROVED	22.370000000000000000000000000000	14.370000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml5w8h240001ugxaadqh8irg	2026-02-14 04:34:13.771	2026-02-14 00:40:15.632	2026-02-14 22:52:17.483	\N	\N	0.000000000000000000000000000000	\N
cmljbuku700016qagpetsdusx	cml6ctvz80021uqrghd4qf3t2	2026-02-11 17:00:00	2026-02-12 10:39:58.53	16.475424300000000000000000000000	99.553469900000000000000000000000	-trvj2p	QR	2026-02-12 22:39:58.53	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 10:39:58.975	2026-02-16 10:37:46.299	\N	\N	0.000000000000000000000000000000	\N
cmljcvg2c0001dr2umh24sgjc	cml6ctv4g000duqrgdybgtyte	2026-02-11 17:00:00	2026-02-12 11:08:38.418	16.436205800000000000000000000000	99.512166200000000000000000000000	7uvltx	QR	2026-02-12 23:10:26.942	16.436268700000000000000000000000	99.512016800000000000000000000000	7uvltx	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	8	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 11:08:39.06	2026-02-13 00:40:02.308	\N	\N	0.000000000000000000000000000000	\N
cmloj0yir0003lvyug83svntf	cml6ctvja0013uqrgbdjr4l0e	2026-02-15 17:00:00	2026-02-16 01:59:44.185	16.455095700000000000000000000000	99.530148299999990000000000000000	-xk7lgp	QR	2026-02-16 13:55:20.181	16.455108300000000000000000000000	99.530040900000000000000000000000	-cvmrg6	GPS	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 01:59:44.835	2026-02-17 00:31:59.272	91	2026-02-16 09:04:02.951	0.000000000000000000000000000000	2026-02-16 07:32:30.076
cmlk2c72w0007g9i8qi2w958a	cml5w8h240001ugxaadqh8irg	2026-02-12 17:00:00	2026-02-12 23:01:30.301	16.475325700000000000000000000000	99.553721400000000000000000000000	-zcd007	QR	2026-02-13 07:00:37.002	16.475168100000000000000000000000	99.553664600000000000000000000000	-zcd007	GPS	APPROVED	6.980000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:01:30.968	2026-02-13 07:00:37.479	\N	\N	0.000000000000000000000000000000	\N
cmlk4opdu0007dfwsh1z9yhy9	cml6ctvms0019uqrg4ft54y7j	2026-02-12 17:00:00	2026-02-13 00:07:13.152	16.455084800000000000000000000000	99.530067000000000000000000000000	-1n18s4	QR	2026-02-13 12:04:00.765	16.455090800000000000000000000000	99.530045100000000000000000000000	-tqfgt7	GPS	APPROVED	10.930000000000000000000000000000	2.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-13 00:07:13.795	2026-02-13 12:04:01.671	60	2026-02-13 06:02:16.861	0.000000000000000000000000000000	2026-02-13 05:01:47.998
cmlczalmt0007infbguw5zvbj	cml6ctvsk001nuqrgooayfxde	2026-02-07 17:00:00	2026-02-08 00:01:53.81	16.475129300000000000000000000000	99.553642200000000000000000000000	-xk7lgp	QR	2026-02-14 00:00:21.186	16.475126400000000000000000000000	99.553605400000000000000000000000	-xk7lgp	GPS	APPROVED	142.970000000000000000000000000000	134.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-08 00:01:54.437	2026-02-14 00:00:22.476	\N	\N	0.000000000000000000000000000000	\N
cmlk4x2px0001dmjt4b3kqz8l	cml5waf57000114p7u4pb0j1l	2026-02-12 17:00:00	2026-02-13 00:13:43.216	16.475382800000000000000000000000	99.553790900000000000000000000000	4uyosu	GPS	2026-02-13 09:55:52.899	16.475306000000000000000000000000	99.553684100000000000000000000000	4uyosu	GPS	APPROVED	8.699999999999999000000000000000	0.700000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-13 00:13:44.326	2026-02-13 09:55:54.329	\N	\N	0.000000000000000000000000000000	\N
cmlk4gqpr0003dfws5xpu76ke	cml6ctvtp001puqrgr6j1clm9	2026-02-12 17:00:00	2026-02-13 00:01:01.643	16.475144400000000000000000000000	99.553737100000010000000000000000	4zl33m	QR	2026-02-13 09:55:59.141	16.475392200000000000000000000000	99.553742000000000000000000000000	4zl33m	GPS	APPROVED	8.900000000000000000000000000000	0.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-13 00:01:02.271	2026-02-13 09:55:59.62	\N	\N	0.000000000000000000000000000000	\N
cmlk4ij100005dfwsjoadojvq	cml6ctv0x0007uqrgprf5lu7c	2026-02-12 17:00:00	2026-02-13 00:02:24.962	16.436387488159200000000000000000	99.511782544061870000000000000000	-85vz5c	QR	2026-02-13 12:06:04.261	16.436387488159200000000000000000	99.511782544061870000000000000000	-85vz5c	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-13 00:02:25.62	2026-02-13 12:06:04.715	53	2026-02-13 07:11:27.45	0.000000000000000000000000000000	2026-02-13 06:18:06.425
cmlj1tkkd0003etuhvmpaoa0w	cml6ctv7w000juqrgh1tdiejn	2026-02-11 17:00:00	2026-02-12 05:59:00	16.436251000000000000000000000000	99.512055000000000000000000000000	rcqple	ADMIN_BACKFILL	2026-02-12 15:30:00	16.436379300000000000000000000000	99.511863300000000000000000000000	rcqple	ADMIN_BACKFILL	APPROVED	8.520000000000000000000000000000	0.520000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	cml61rz7u000111dofdoy94sd	2026-02-14 13:16:59.636	2026-02-12 05:59:15.805	2026-02-21 04:49:35.586	\N	\N	0.000000000000000000000000000000	\N
cmlk3uxis0003nkbe3ddp6ydt	cml6cv8uy000713l7zocqn0fn	2026-02-12 17:00:00	2026-02-12 23:44:03.529	16.475280000000000000000000000000	99.553717800000000000000000000000	-trvj2p	QR	2026-02-13 10:09:18.971	16.475180600000000000000000000000	99.553639200000010000000000000000	-trvj2p	GPS	APPROVED	9.420000000000000000000000000000	1.420000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:44:04.66	2026-02-13 10:09:20.548	\N	\N	0.000000000000000000000000000000	\N
cmlk43yuy0007nkbeslbjagi7	cml6ctvsk001nuqrgooayfxde	2026-02-12 17:00:00	2026-02-12 23:51:05.186	16.475164900000000000000000000000	99.553642500000000000000000000000	-xk7lgp	GPS	2026-02-13 09:56:19.948	16.475436800000000000000000000000	99.553770000000000000000000000000	-xk7lgp	GPS	APPROVED	9.080000000000000000000000000000	1.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:51:06.299	2026-02-13 09:56:20.666	\N	\N	0.000000000000000000000000000000	\N
cmlk42cca0005nkbeme5e02im	cml6cv8sm000313l7yhueq5zy	2026-02-12 17:00:00	2026-02-12 23:49:49.794	16.455092100000000000000000000000	99.530074000000000000000000000000	-oka4kb	QR	2026-02-13 10:01:15.91	16.454814800000000000000000000000	99.530145000000000000000000000000	jl0pv7	GPS	APPROVED	9.180000000000000000000000000000	1.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:49:50.458	2026-02-13 10:01:16.337	\N	\N	0.000000000000000000000000000000	\N
cmlk5awc20001lac1cqgk6k36	cml6ctvqa001huqrgn8fa8qe5	2026-02-12 17:00:00	2026-02-13 00:24:28.588	16.455013500000000000000000000000	99.530366000000000000000000000000	g3up74	QR	2026-02-13 10:02:27.747	16.454800000000000000000000000000	99.530215000000000000000000000000	g3up74	GPS	APPROVED	8.619999999999999000000000000000	0.620000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-13 00:24:29.235	2026-02-13 10:02:28.169	\N	\N	0.000000000000000000000000000000	\N
cmlk40qhi0001dfwsvbatn6jy	cml6ctuwf0001uqrgn7ktp9je	2026-02-12 17:00:00	2026-02-12 23:48:34.36	16.436365000000000000000000000000	99.511943300000000000000000000000	4uyosu	QR	2026-02-13 10:06:08.15	16.436329000000000000000000000000	99.511946700000000000000000000000	4uyosu	GPS	APPROVED	9.279999999999999000000000000000	1.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:48:35.478	2026-02-13 10:06:09.229	\N	\N	0.000000000000000000000000000000	\N
cmlk3u7ru0001nkbeh3b6329u	cml6cv8ts000513l7uydg8j16	2026-02-12 17:00:00	2026-02-12 23:43:30.625	16.475378200000000000000000000000	99.553727100000000000000000000000	-p0zg9d	QR	2026-02-13 10:09:27.912	16.475197000000000000000000000000	99.553720100000010000000000000000	-p0zg9d	GPS	APPROVED	9.420000000000000000000000000000	1.420000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:43:31.291	2026-02-13 10:09:28.339	\N	\N	0.000000000000000000000000000000	\N
cmlk4bli30009nkbe9q0unoms	cml6cv8qd000113l7pz55vip3	2026-02-12 17:00:00	2026-02-12 23:57:00.986	16.455083400000000000000000000000	99.529976400000000000000000000000	-xgf12i	QR	2026-02-13 10:29:30.033	16.455036000000000000000000000000	99.529769000000000000000000000000	-xgf12i	GPS	APPROVED	9.529999999999999000000000000000	1.530000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:57:02.236	2026-02-13 10:29:31.308	\N	\N	0.000000000000000000000000000000	\N
cmlk2hrcd000bg9i8k8bf8kds	cml6ctuzt0005uqrgdnihhrcg	2026-02-12 17:00:00	2026-02-12 23:05:49.87	16.436335000000000000000000000000	99.511909700000000000000000000000	-tvo3gw	QR	2026-02-13 11:06:11.976	16.436377800000000000000000000000	99.511856600000000000000000000000	-tvo3gw	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:05:50.509	2026-02-13 11:06:12.613	60	2026-02-13 06:16:24.23	0.000000000000000000000000000000	2026-02-13 05:15:58.552
cmlk2bd160005g9i8ler3tfk6	cml6ctvja0013uqrgbdjr4l0e	2026-02-12 17:00:00	2026-02-12 23:00:51.359	16.455060200000000000000000000000	99.529927700000000000000000000000	-xk7lgp	QR	2026-02-13 11:08:47.398	16.455085900000000000000000000000	99.530127699999990000000000000000	cs669g	GPS	APPROVED	11.120000000000000000000000000000	3.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:00:52.026	2026-02-13 11:08:48.324	87	2026-02-13 06:00:17.446	0.000000000000000000000000000000	2026-02-13 04:32:35.354
cmlk2funj000110auuxaa8mnt	cml6ctv6r000huqrg08xd4xcm	2026-02-12 17:00:00	2026-02-12 23:04:20.829	16.436358938779530000000000000000	99.511872025725680000000000000000	579pd4	QR	2026-02-13 15:24:59.528	16.436354047523880000000000000000	99.511854198243010000000000000000	579pd4	GPS	APPROVED	15.330000000000000000000000000000	7.330000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:04:21.487	2026-02-13 15:25:00.158	\N	\N	0.000000000000000000000000000000	\N
cmlioptcf000d12034rqvhfr4	cml6ctuwf0001uqrgn7ktp9je	2026-02-11 17:00:00	2026-02-11 23:52:24.908	16.436276700000000000000000000000	99.512030700000000000000000000000	4uyosu	QR	2026-02-14 10:01:47.823	16.436367800000000000000000000000	99.511869800000000000000000000000	4uyosu	GPS	APPROVED	57.150000000000000000000000000000	49.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 23:52:25.551	2026-02-14 10:01:48.68	\N	\N	0.000000000000000000000000000000	\N
cmlkptanf0001aw701vrm7mkk	cml6cv8w4000913l7imruilgz	2026-02-12 17:00:00	2026-02-13 00:30:00	16.474950100000000000000000000000	99.553656100000000000000000000000	-7x56ss	ADMIN_EDIT	2026-02-14 10:02:36.708	16.475180500000000000000000000000	99.553644100000000000000000000000	-x7wv4j	GPS	APPROVED	32.530000000000000000000000000000	24.530000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 09:58:39.916	2026-02-14 10:02:37.134	\N	\N	0.000000000000000000000000000000	\N
cmlk5ca1z0003lac1ucccu5rn	cml6ctvb9000puqrgafxo42i7	2026-02-12 17:00:00	2026-02-13 00:25:33.025	16.436321600000000000000000000000	99.511939900000000000000000000000	-xgf12i	QR	2026-02-13 12:25:33.025	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-13 00:25:33.671	2026-02-16 11:54:02.792	\N	\N	0.000000000000000000000000000000	\N
cmllv38um0001x33l26b7ow83	cml6ctv270009uqrg7spxr9d4	2026-02-13 17:00:00	2026-02-14 05:14:07.973	16.436194800000000000000000000000	99.512112500000000000000000000000	4uyosu	QR	2026-02-14 23:15:58.892	16.436470000000000000000000000000	99.511751700000000000000000000000	4uyosu	GPS	APPROVED	17.020000000000000000000000000000	9.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 05:14:08.398	2026-02-15 00:13:35.339	\N	\N	0.000000000000000000000000000000	\N
cmllkwr820003659xwgujgy3i	cml6ctvrh001luqrg60imh1k9	2026-02-13 17:00:00	2026-02-14 00:29:08.373	16.475183500000000000000000000000	99.553653100000010000000000000000	-tvo3gw	QR	2026-02-14 10:29:33.743	16.475180300000000000000000000000	99.553636900000000000000000000000	-tvo3gw	GPS	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 00:29:09.459	2026-02-15 00:13:35.339	\N	\N	0.000000000000000000000000000000	2026-02-14 10:28:17.332
cmlllv6p200035nbx4d1w2e8f	cml6ctvp6001fuqrgjo0cut8g	2026-02-13 17:00:00	2026-02-14 00:55:55.175	16.455070000000000000000000000000	99.530106200000010000000000000000	-ilt8ll	QR	2026-02-14 10:03:46.902	16.455022400000000000000000000000	99.529761500000010000000000000000	-ilt8ll	GPS	APPROVED	8.119999999999999000000000000000	0.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 00:55:55.815	2026-02-15 00:13:35.339	\N	\N	0.000000000000000000000000000000	\N
cmllo7dlo0003gpn7m10tace5	cml6ctvhm0011uqrgd2s6gv12	2026-02-13 17:00:00	2026-02-14 02:01:22.735	16.455047700000000000000000000000	99.530163500000000000000000000000	4uyosu	QR	2026-02-14 14:00:07.589	16.455084900000000000000000000000	99.530125100000010000000000000000	4uyosu	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 02:01:23.868	2026-02-15 00:13:35.339	88	2026-02-14 07:31:19.758	0.000000000000000000000000000000	2026-02-14 06:02:23.516
cmllobyio0001bz6yryv9vizo	cml5g22hz002gua47temxhj1t	2026-02-13 17:00:00	2026-02-14 02:04:56.08	16.475200300000000000000000000000	99.553697500000000000000000000000	ccsx7a	GPS	2026-02-14 14:10:01.917	16.475189100000000000000000000000	99.553640500000000000000000000000	ccsx7a	GPS	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	4	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 02:04:57.6	2026-02-15 00:13:35.339	85	2026-02-14 09:00:26.109	0.000000000000000000000000000000	2026-02-14 07:35:08.649
cmlll8lro00019gk04n5w2mwi	cml5g1xzx001oua47iy5u23oh	2026-02-13 17:00:00	2026-02-14 00:38:21.194	16.475409000000000000000000000000	99.553902100000000000000000000000	g3up74	QR	2026-02-14 11:31:05.26	16.475191500000000000000000000000	99.553788800000010000000000000000	g3up74	GPS	APPROVED	9.869999999999999000000000000000	1.870000000000000000000000000000	38	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 00:38:22.26	2026-02-15 00:13:35.339	87	2026-02-14 05:28:58.79	0.000000000000000000000000000000	2026-02-14 04:01:33.621
cmlvhxl6r0009o5v7b4z4b3qt	cml5g1tky000wua47qqpf53wn	2026-02-18 17:00:00	2026-02-19 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-19 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-20 23:03:31.203	2026-02-22 03:32:47.92	\N	\N	0.000000000000000000000000000000	\N
cmlp05m4m0001dc5howsx9rb0	cml5waf57000114p7u4pb0j1l	2026-02-15 17:00:00	2026-02-16 09:59:14.9	16.475228100000000000000000000000	99.553817499999990000000000000000	vr2ul	QR	2026-02-16 09:59:44.748	16.475254600000000000000000000000	99.553571500000000000000000000000	vr2ul	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	539	\N	450.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 09:59:15.526	2026-02-17 00:31:59.272	\N	\N	0.000000000000000000000000000000	\N
cmlh7iopi000911sh9wjq09xa	cml6ctv3c000buqrguslcci85	2026-02-10 17:00:00	2026-02-10 23:03:12.851	16.436444110101820000000000000000	99.511838186728680000000000000000	gg44cx	QR	2026-02-11 11:05:00	16.436257204560410000000000000000	99.511682135737760000000000000000	gg44cx	MANUAL	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-11 07:23:23.315	2026-02-10 23:03:13.302	2026-02-21 03:18:21.138	61	2026-02-11 04:06:11.537	0.000000000000000000000000000000	2026-02-11 03:04:52.3
cmllvxlzi0005qhxc9xe8sjy9	cml6ctvwy001xuqrgl2hwd8y1	2026-02-13 17:00:00	2026-02-14 05:37:44.458	16.455074800000000000000000000000	99.530154000000000000000000000000	-wfhbzg	QR	2026-02-14 14:00:00	16.455062100000000000000000000000	99.530143300000010000000000000000	ymf41f	ADMIN_EDIT	APPROVED	8.370983888888889000000000000000	9.820000000000000000000000000000	427	\N	400.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 05:37:45.103	2026-02-21 03:28:25.847	\N	\N	0.000000000000000000000000000000	\N
cmlmzmnzo000168gj2vcu0ryj	cml5waf57000114p7u4pb0j1l	2026-02-14 17:00:00	2026-02-15 00:08:58	16.475211800000000000000000000000	99.553662000000000000000000000000	vr2ul	GPS	2026-02-15 08:56:17.396	16.475494300000000000000000000000	99.553845800000000000000000000000	vr2ul	GPS	APPROVED	7.780000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-15 00:08:59.124	2026-02-15 08:56:18.258	\N	\N	0.000000000000000000000000000000	\N
cmln0ac66000768gj0vubrdgp	cml6ctvwy001xuqrgl2hwd8y1	2026-02-14 17:00:00	2026-02-15 00:27:22.491	16.455128300000000000000000000000	99.530096700000000000000000000000	ymf41f	QR	2026-02-15 12:51:27.017	16.455090000000000000000000000000	99.530105600000000000000000000000	ymf41f	GPS	APPROVED	11.400000000000000000000000000000	3.400000000000000000000000000000	117	\N	100.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-15 01:59:24.243	2026-02-15 00:27:23.55	2026-02-15 12:51:28.451	\N	\N	0.000000000000000000000000000000	\N
cmlmzqua9000368gjeq28q9ve	cml6ctvms0019uqrg4ft54y7j	2026-02-14 17:00:00	2026-02-15 00:12:13.262	16.455096700000000000000000000000	99.530126200000000000000000000000	-1n18s4	QR	2026-02-15 12:01:33.332	16.455059300000000000000000000000	99.530139700000010000000000000000	-tqfgt7	GPS	APPROVED	10.820000000000000000000000000000	2.820000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-15 00:12:13.906	2026-02-15 12:01:34.19	61	2026-02-15 06:01:37.894	0.000000000000000000000000000000	2026-02-15 05:00:15.688
cmln0j1uh000fvk9ynrupaur2	cml6ctvrh001luqrg60imh1k9	2026-02-14 17:00:00	2026-02-15 00:34:08.956	16.475171800000000000000000000000	99.553627600000000000000000000000	-tvo3gw	GPS	2026-02-15 09:28:21.174	16.475367500000000000000000000000	99.553775900000010000000000000000	-tvo3gw	GPS	APPROVED	7.900000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 00:34:10.074	2026-02-16 00:12:25.331	\N	\N	0.000000000000000000000000000000	\N
cmlmwwadx000bv1y190ng5ois	cml6ctuzt0005uqrgdnihhrcg	2026-02-14 17:00:00	2026-02-14 22:52:28.559	16.436319900000000000000000000000	99.511922299999990000000000000000	-tvo3gw	QR	2026-02-15 11:02:50.376	16.436379300000000000000000000000	99.511845900000000000000000000000	-xuvpf5	GPS	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 22:52:29.206	2026-02-15 11:02:50.802	65	2026-02-15 05:13:40.357	0.000000000000000000000000000000	2026-02-15 04:08:38.788
cmlmz9lfb000774ihfbhnnkty	cml6ctvtp001puqrgr6j1clm9	2026-02-14 17:00:00	2026-02-14 23:58:48.596	16.475382400000000000000000000000	99.553655000000010000000000000000	4zl33m	QR	2026-02-15 09:59:26.802	16.475571100000000000000000000000	99.553834499999990000000000000000	4zl33m	GPS	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 23:58:49.271	2026-02-15 09:59:27.438	\N	\N	0.000000000000000000000000000000	\N
cmlmz9du4000574ihescpgwit	cml6ctv0x0007uqrgprf5lu7c	2026-02-14 17:00:00	2026-02-14 23:58:38.307	16.436273157294400000000000000000	99.511436970352580000000000000000	-85vz5c	QR	2026-02-15 12:02:06.332	16.436392087579790000000000000000	99.511790680246780000000000000000	-85vz5c	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 23:58:39.437	2026-02-15 12:02:06.763	64	2026-02-15 07:22:47.131	0.000000000000000000000000000000	2026-02-15 06:18:13.017
cmlmzb38q000dvk9yuzhnmwc0	cml6ctvsk001nuqrgooayfxde	2026-02-14 17:00:00	2026-02-14 23:59:57.919	16.475074800000000000000000000000	99.553616899999990000000000000000	-xk7lgp	QR	2026-02-15 08:57:37.423	16.475431800000000000000000000000	99.553245899999990000000000000000	-xk7lgp	GPS	APPROVED	7.950000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 23:59:59.018	2026-02-15 08:57:38.069	\N	\N	0.000000000000000000000000000000	\N
cmln1akfl000112ualt26kw4s	cml6ctveb000vuqrg3ulgugaj	2026-02-15 00:00:00	2026-02-14 22:31:00	\N	\N	\N	MANUAL	2026-02-15 10:31:00	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.)	cml6ctveb000vuqrg3ulgugaj	2026-02-15 00:57:52.382	2026-02-15 00:55:33.874	2026-02-16 05:55:57.7	\N	\N	0.000000000000000000000000000000	\N
cmlmz3iug000374ih6uqqxtnc	cml6cv8sm000313l7yhueq5zy	2026-02-14 17:00:00	2026-02-14 23:54:05.327	16.455041700000000000000000000000	99.530169700000000000000000000000	-oka4kb	QR	2026-02-15 10:01:34.665	16.454972300000000000000000000000	99.530051200000000000000000000000	jl0pv7	GPS	APPROVED	9.119999999999999000000000000000	1.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 23:54:05.992	2026-02-15 10:01:35.554	\N	\N	0.000000000000000000000000000000	\N
cmlmz3oq80009vk9yosqqnafz	cml6ctuwf0001uqrgn7ktp9je	2026-02-14 17:00:00	2026-02-14 23:54:12.556	16.436312800000000000000000000000	99.512071500000000000000000000000	4uyosu	QR	2026-02-15 10:04:43.785	16.436243100000000000000000000000	99.512082400000000000000000000000	vr2ul	GPS	APPROVED	9.170000000000000000000000000000	1.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 23:54:13.617	2026-02-15 10:04:45.144	\N	\N	0.000000000000000000000000000000	\N
cmlmytuja000174ihmwtoy1nw	cml6cv8ts000513l7uydg8j16	2026-02-14 17:00:00	2026-02-14 23:46:33.908	16.475188800000000000000000000000	99.553642100000000000000000000000	-p0zg9d	QR	2026-02-15 10:09:59.503	16.475245700000000000000000000000	99.553838900000000000000000000000	-p0zg9d	GPS	APPROVED	9.380000000000001000000000000000	1.380000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 23:46:34.582	2026-02-15 10:10:00.148	\N	\N	0.000000000000000000000000000000	\N
cmln18jxw0001hq74m5v0rute	cml6ctvp6001fuqrgjo0cut8g	2026-02-14 17:00:00	2026-02-15 00:53:59.266	16.455050500000000000000000000000	99.530194499999990000000000000000	-ilt8ll	QR	2026-02-15 10:11:01.972	16.455045500000000000000000000000	99.530178600000000000000000000000	foxrw	GPS	APPROVED	8.279999999999999000000000000000	0.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-15 00:55:06.93	2026-02-15 00:53:59.924	2026-02-15 10:11:02.613	\N	\N	0.000000000000000000000000000000	\N
cmlmvs9zc0001v1y1amlcl0nj	cml5g1qzg000iua472zcpgugd	2026-02-14 17:00:00	2026-02-14 22:21:21.125	16.475141800000000000000000000000	99.553717700000010000000000000000	-8s2lny	QR	2026-02-15 10:36:34.57	16.475179400000000000000000000000	99.553626700000000000000000000000	-8s2lny	GPS	APPROVED	11.250000000000000000000000000000	3.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 22:21:22.44	2026-02-15 10:36:35.419	87	2026-02-15 06:00:37.45	0.000000000000000000000000000000	2026-02-15 04:33:36.157
cmlmww7nl0009v1y10hyd7k6l	cml5g1xzx001oua47iy5u23oh	2026-02-14 17:00:00	2026-02-14 22:52:24.55	16.475178700000000000000000000000	99.553635400000000000000000000000	g3up74	GPS	2026-02-15 11:01:20.969	16.475207300000000000000000000000	99.553723000000010000000000000000	g3up74	GPS	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 22:52:25.665	2026-02-15 11:01:22.244	90	2026-02-15 04:30:57.474	0.000000000000000000000000000000	2026-02-15 03:00:05.039
cmln95wab0001oqwihm9hygus	cml5g1tky000wua47qqpf53wn	2026-02-15 00:00:00	2026-02-14 23:30:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	\N	cml5w8h240001ugxaadqh8irg	2026-02-15 04:37:31.086	2026-02-15 04:35:52.883	2026-02-15 04:37:31.087	\N	\N	0.000000000000000000000000000000	\N
cmln3m9oj000bhq74a5zkamay	cml5g22hz002gua47temxhj1t	2026-02-14 17:00:00	2026-02-15 02:00:37.755	16.475217300000000000000000000000	99.553677100000000000000000000000	8dlb91	GPS	2026-02-15 13:58:06.062	16.475183000000000000000000000000	99.553643699999990000000000000000	8dlb91	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 02:00:39.044	2026-02-16 00:12:25.331	109	2026-02-15 07:52:47.779	27.500000000000000000000000000000	2026-02-15 06:03:11.271
cmldn6m8c0003i8gwgtv2w1ni	cml6ctv4g000duqrgdybgtyte	2026-02-07 17:00:00	2026-02-08 11:10:38.734	16.436494000000000000000000000000	99.511905900000000000000000000000	7uvltx	QR	2026-02-09 11:10:38.734	\N	\N	\N	\N	APPROVED	24.000000000000000000000000000000	\N	10	\N	50.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 26 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 11:10:39.372	2026-02-17 11:10:32.04	\N	\N	0.000000000000000000000000000000	\N
cmlpsktjr0003j4oeob91cx3k	cml6ctv270009uqrg7spxr9d4	2026-02-16 17:00:00	2026-02-16 23:14:53.595	16.436280900000000000000000000000	99.511947600000000000000000000000	4uyosu	QR	2026-02-17 11:10:59.895	16.436239500000000000000000000000	99.511927000000000000000000000000	4uyosu	GPS	APPROVED	10.930000000000000000000000000000	2.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:14:54.231	2026-02-17 11:11:00.378	0	2026-02-17 06:08:43.731	0.000000000000000000000000000000	2026-02-17 06:08:27.9
cmlpuho1d00011wzjgz48vlnh	cml6ctv0x0007uqrgprf5lu7c	2026-02-16 17:00:00	2026-02-17 00:08:25.702	16.436425382286720000000000000000	99.511919673624920000000000000000	-85vz5c	QR	2026-02-17 12:12:54.917	16.436392081642080000000000000000	99.511789911554440000000000000000	-85vz5c	GPS	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-17 00:08:26.354	2026-02-17 12:12:55.601	58	2026-02-17 07:09:17.876	0.000000000000000000000000000000	2026-02-17 06:10:42.153
cmlvhy2c3000911by48lg768q	cml5g1tky000wua47qqpf53wn	2026-02-19 17:00:00	2026-02-20 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-20 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-20 23:03:53.427	2026-02-22 03:32:48.559	\N	\N	0.000000000000000000000000000000	\N
cmlpyaj9o0001vh8akyrtyv3e	cml5g289u003uua47ulssk26x	2026-02-16 17:00:00	2026-02-17 01:54:50.932	16.475190700000000000000000000000	99.553748100000010000000000000000	ktr8uu	GPS	2026-02-17 13:55:26.136	16.475191400000000000000000000000	99.553524100000000000000000000000	ktr8uu	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 01:54:52.044	2026-02-18 00:31:59.293	87	2026-02-17 07:28:03.096	0.000000000000000000000000000000	2026-02-17 06:00:17.163
cmlpydij00001a7guszz08qns	cml6ctvgi000zuqrguiuyi2de	2026-02-16 17:00:00	2026-02-17 01:57:10.385	16.455095000000000000000000000000	99.530126000000000000000000000000	-1n18s4	QR	2026-02-17 13:54:19.801	16.455105400000000000000000000000	99.530090700000000000000000000000	hl88nd	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 01:57:11.052	2026-02-18 00:31:59.293	88	2026-02-17 07:29:16.897	0.000000000000000000000000000000	2026-02-17 06:00:50.671
cmlqo0ojb0003oa8bntktwik9	cml5g20im0022ua4780xu5bou	2026-02-16 17:00:00	2026-02-17 13:55:00.852	16.475060600000000000000000000000	99.553200600000000000000000000000	-rrm7pw	QR	2026-02-17 13:55:32.094	16.475169500000000000000000000000	99.553633700000010000000000000000	-rrm7pw	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	715	\N	600.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 13:55:02.327	2026-02-18 00:31:59.293	\N	\N	0.000000000000000000000000000000	\N
cmlk2fgeg0009g9i8jemq1vib	cml6ctv3c000buqrguslcci85	2026-02-12 17:00:00	2026-02-12 23:04:02.349	16.436484133690520000000000000000	99.511676169992710000000000000000	gg44cx	QR	2026-02-13 11:10:00	16.436215444163470000000000000000	99.511731131169370000000000000000	gg44cx	MANUAL	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 23:04:03.016	2026-02-21 03:18:53.298	62	2026-02-13 04:09:04.258	0.000000000000000000000000000000	2026-02-13 03:06:21.261
cmlvtsrbn000t9q91pr7q36cq	cml6ctuzt0005uqrgdnihhrcg	2026-02-03 17:00:00	2026-02-03 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 05:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	5.080000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:41.267	2026-02-21 04:35:41.267	\N	\N	0.000000000000000000000000000000	\N
cmlvhyunm000b11byofj2gg6k	cml5g1tky000wua47qqpf53wn	2026-02-20 17:00:00	2026-02-21 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-21 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	90	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-20 23:04:30.13	2026-02-22 03:32:49.198	\N	\N	0.000000000000000000000000000000	\N
cmlqh2pzc0001nwphibk0pjuh	cml6ctvz80021uqrghd4qf3t2	2026-02-16 17:00:00	2026-02-17 10:40:38.618	16.475179700000000000000000000000	99.553646500000000000000000000000	-trvj2p	QR	2026-02-17 22:40:38.618	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 10:40:40.2	2026-02-18 10:41:20.29	\N	\N	0.000000000000000000000000000000	\N
cmldblm4q0001sq0m6buz16v5	cml6ctveb000vuqrg3ulgugaj	2026-02-07 17:00:00	2026-02-08 05:46:23.225	16.455041200000000000000000000000	99.530069600000000000000000000000	-c3lq7g	QR	2026-02-08 17:46:23.225	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.)	cml6ctveb000vuqrg3ulgugaj	2026-02-08 05:47:03.569	2026-02-08 05:46:23.691	2026-02-18 05:48:48.665	\N	\N	0.000000000000000000000000000000	\N
cmlr7fbf6000543ngbotnaan5	cml6ctvwy001xuqrgl2hwd8y1	2026-02-17 17:00:00	2026-02-17 22:58:17.047	16.455054200000000000000000000000	99.530143499999990000000000000000	ymf41f	QR	2026-02-18 11:02:08.884	16.455037900000000000000000000000	99.530165000000000000000000000000	ymf41f	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	28	\N	50.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 23:48:04.285	2026-02-17 22:58:17.874	2026-02-18 11:02:09.764	89	2026-02-18 05:59:14.572	0.000000000000000000000000000000	2026-02-18 04:30:06.225
cmlrdrimy0007i6smgsk97055	cml6ctvgi000zuqrguiuyi2de	2026-02-17 17:00:00	2026-02-18 01:55:44.161	16.455071000000000000000000000000	99.530150000000010000000000000000	-1n18s4	QR	2026-02-18 13:53:57.077	16.455049200000000000000000000000	99.530081600000000000000000000000	hl88nd	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-18 05:51:18.684	2026-02-18 01:55:44.794	2026-02-18 13:53:57.508	85	2026-02-18 07:28:24.571	0.000000000000000000000000000000	2026-02-18 06:02:31.974
cmlrasrzq0001xi7jan8cv1dr	cml6ctvqa001huqrgn8fa8qe5	2026-02-17 17:00:00	2026-02-18 00:32:44.086	16.455191200000000000000000000000	99.530094600000000000000000000000	g3up74	QR	2026-02-18 10:01:22.343	16.455068800000000000000000000000	99.530094500000000000000000000000	g3up74	GPS	APPROVED	8.470000000000001000000000000000	0.470000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-18 05:51:34.966	2026-02-18 00:32:44.726	2026-02-18 10:01:23.232	\N	\N	0.000000000000000000000000000000	\N
cmlr67kue0001dey8y7hdsuhu	cml5g1qzg000iua472zcpgugd	2026-02-17 17:00:00	2026-02-17 22:24:16.113	16.475176600000000000000000000000	99.553639399999990000000000000000	ntdgyb	QR	2026-02-18 10:32:20.651	16.475085100000000000000000000000	99.553615800000000000000000000000	ntdgyb	GPS	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 22:24:17.223	2026-02-18 10:32:21.923	87	2026-02-18 04:59:30.368	0.000000000000000000000000000000	2026-02-18 03:32:10.525
cml9dzd4e0003dun8srqpnefz	cml6ctv5n000fuqrg94t826wg	2026-02-05 00:00:00	2026-02-05 11:41:59.086	16.436292700000000000000000000000	99.512046000000000000000000000000	jzx37b	QR	2026-02-06 11:41:59.086	\N	\N	\N	\N	APPROVED	24.000000000000000000000000000000	\N	41	\N	50.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 26 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 11:41:59.726	2026-02-18 11:06:39.765	\N	\N	0.000000000000000000000000000000	\N
cmlc7nv3b0001j7fklsk6gqx7	cml6ctv4g000duqrgdybgtyte	2026-02-06 17:00:00	2026-02-07 11:08:23.105	16.436363000000000000000000000000	99.511917000000000000000000000000	7uvltx	QR	2026-02-08 11:08:23.105	\N	\N	\N	\N	APPROVED	24.000000000000000000000000000000	\N	8	\N	50.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 26 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 11:08:23.976	2026-02-18 11:08:59.321	0	2026-02-07 13:47:13.335	0.000000000000000000000000000000	2026-02-07 13:46:32.454
cmlr82qzp00035z4p4om67il2	cml6ctv270009uqrg7spxr9d4	2026-02-17 17:00:00	2026-02-17 23:16:30.494	16.436309300000000000000000000000	99.511923400000000000000000000000	4uyosu	QR	2026-02-18 11:11:06.908	16.436245400000000000000000000000	99.512065200000000000000000000000	4uyosu	GPS	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:16:31.141	2026-02-18 11:11:07.334	0	2026-02-18 05:06:10.474	0.000000000000000000000000000000	2026-02-18 05:05:50.035
cmlrdvee40001mt4idusjtk42	cml6ctvja0013uqrgbdjr4l0e	2026-02-17 17:00:00	2026-02-18 01:58:45.287	16.455109000000000000000000000000	99.530192700000000000000000000000	-xk7lgp	QR	2026-02-18 13:53:47.179	16.455094900000000000000000000000	99.530054800000000000000000000000	-cvmrg6	GPS	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-18 05:51:09.219	2026-02-18 01:58:45.917	2026-02-18 13:53:48.042	87	2026-02-18 08:59:54.998	0.000000000000000000000000000000	2026-02-18 07:32:30.147
cmlrm39760001scfxna99ppzf	cml6ctveb000vuqrg3ulgugaj	2026-02-17 17:00:00	2026-02-18 05:48:48.237	16.455056500000000000000000000000	99.530116900000000000000000000000	-g2tc5p	QR	2026-02-18 14:25:00	\N	\N	\N	MANUAL	APPROVED	7.600000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-18 05:51:02.326	2026-02-18 05:48:49.362	2026-02-18 22:34:24.35	\N	\N	0.000000000000000000000000000000	\N
cmlrarx3m0001xuctdqmg7i8p	cml6ctuyp0003uqrgejbtvcmm	2026-02-17 17:00:00	2026-02-18 00:32:04.059	16.436466400000000000000000000000	99.511780599999990000000000000000	ysf08w	QR	2026-02-18 12:32:36.431	16.436287500000000000000000000000	99.511960200000000000000000000000	ysf08w	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 00:32:04.691	2026-02-19 00:31:59.241	\N	\N	0.000000000000000000000000000000	\N
cmlhlh2r0000111pljny5txnd	cml5cxygj0003v68ql9533bl3	2026-02-10 17:00:00	2026-02-11 05:33:52.364	16.475194400000000000000000000000	99.553638500000010000000000000000	-wfhbzg	QR	2026-02-15 05:40:51.394	16.475192300000000000000000000000	99.553618500000000000000000000000	-wfhbzg	GPS	APPROVED	95.099999999999990000000000000000	87.099999999999990000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 05:33:52.812	2026-02-15 05:40:51.832	\N	\N	0.000000000000000000000000000000	\N
cmlocp2uc0001ev4wah1jywar	cml6ctvff000xuqrgvuiy6k2z	2026-02-15 17:00:00	2026-02-15 23:02:00	\N	\N	\N	MANUAL	2026-02-16 11:00:00	\N	\N	\N	MANUAL	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-15 23:02:32.869	2026-02-16 23:17:37.201	\N	\N	0.000000000000000000000000000000	\N
cmllhs19p00073r6q0l69d6o6	cml6ctv3c000buqrguslcci85	2026-02-13 17:00:00	2026-02-13 23:01:29.71	16.436382143682650000000000000000	99.511902067803040000000000000000	gg44cx	QR	2026-02-14 11:12:00	16.436522749839410000000000000000	99.511672532052900000000000000000	gg44cx	MANUAL	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 23:01:30.349	2026-02-21 03:19:54.303	56	2026-02-14 04:02:27.975	0.000000000000000000000000000000	2026-02-14 03:05:48.69
cmloevxl3000nyc3qwy542nqk	cml6ctvtp001puqrgr6j1clm9	2026-02-15 17:00:00	2026-02-16 00:03:51.258	16.475210100000000000000000000000	99.553714600000010000000000000000	4zl33m	QR	2026-02-16 12:03:51.258	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-16 00:03:51.88	2026-02-17 09:59:56.408	\N	\N	0.000000000000000000000000000000	\N
cml8nqm9e0003qxuyaih9g549	cml6cv8uy000713l7zocqn0fn	2026-02-05 00:00:00	2026-02-04 23:27:21.211	16.475183500000000000000000000000	99.553652700000000000000000000000	-trvj2p	QR	2026-02-15 10:01:59.171	16.475191400000000000000000000000	99.553651200000000000000000000000	-trvj2p	GPS	APPROVED	249.570000000000000000000000000000	241.570000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-04 23:27:21.65	2026-02-15 10:01:59.621	\N	\N	0.000000000000000000000000000000	\N
cmlmwsx600001dd6x6dyqu8nl	cml6ctv3c000buqrguslcci85	2026-02-14 17:00:00	2026-02-14 22:49:51.469	16.436244319568870000000000000000	99.511746659895860000000000000000	gg44cx	QR	2026-02-15 11:10:00	16.436522749839410000000000000000	99.511672532052900000000000000000	gg44cx	MANUAL	APPROVED	11.330000000000000000000000000000	3.330000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-15 07:13:35.338	2026-02-14 22:49:52.105	2026-02-21 03:20:10.372	56	2026-02-15 04:07:47.874	0.000000000000000000000000000000	2026-02-15 03:11:03.08
cmln3l650000312uam88qhncz	cml6ctvff000xuqrgvuiy6k2z	2026-02-15 00:00:00	2026-02-15 01:59:00	\N	\N	\N	MANUAL	2026-02-15 14:03:00	\N	\N	\N	MANUAL	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-15 01:59:47.796	2026-02-15 14:03:34.144	\N	\N	0.000000000000000000000000000000	\N
cmln0lzac000hvk9ya6jo8v28	cml6cv8w4000913l7imruilgz	2026-02-14 17:00:00	2026-02-15 00:36:26.089	16.475256500000000000000000000000	99.553760299999990000000000000000	-7x56ss	QR	2026-02-15 12:36:26.089	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 00:36:26.724	2026-02-17 10:01:07.532	\N	\N	0.000000000000000000000000000000	\N
cmlpu16sh000360nwrvvsvzeu	cml6cv8sm000313l7yhueq5zy	2026-02-16 17:00:00	2026-02-16 23:55:36.86	16.455048200000000000000000000000	99.530008300000010000000000000000	-oka4kb	QR	2026-02-17 10:01:25.358	16.454939500000000000000000000000	99.529954100000000000000000000000	jl0pv7	GPS	APPROVED	9.080000000000000000000000000000	1.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:55:37.506	2026-02-17 10:01:25.79	\N	\N	0.000000000000000000000000000000	\N
cmlvrd6lq000rv692t3d8svv1	cml6ctvwy001xuqrgl2hwd8y1	2026-02-12 17:00:00	\N	\N	\N	\N	\N	2026-02-13 14:00:00	\N	\N	\N	ADMIN_EDIT	APPROVED	\N	\N	\N	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 03:27:35.343	2026-02-22 00:41:03.355	\N	\N	0.000000000000000000000000000000	\N
cmlk8h2hq0003x1mua0k77wox	cml5g20im0022ua4780xu5bou	2026-02-12 17:00:00	2026-02-13 01:53:14.874	16.475180800000000000000000000000	99.553656000000000000000000000000	-nselrn	GPS	2026-02-13 13:53:14.874	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 01:53:15.998	2026-02-17 13:55:01.484	89	2026-02-15 06:33:48.391	0.000000000000000000000000000000	2026-02-15 05:04:33.138
cmlocjj5z0001yc3qpk9hnp53	cml6ctvsk001nuqrgooayfxde	2026-02-15 17:00:00	2026-02-15 22:58:12.581	16.475280400000000000000000000000	99.553766700000000000000000000000	-xk7lgp	QR	2026-02-16 10:58:12.581	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:58:14.087	2026-02-18 00:02:16.973	\N	\N	0.000000000000000000000000000000	\N
cmln1oqsm0009hq74q6t7jccp	cml5g289u003uua47ulssk26x	2026-02-14 17:00:00	2026-02-15 01:06:34.242	16.475067000000000000000000000000	99.553169600000000000000000000000	ktr8uu	QR	2026-02-15 13:00:36.849	16.475292200000000000000000000000	99.553629500000000000000000000000	ktr8uu	GPS	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	6	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 01:06:35.302	2026-02-16 00:12:25.331	88	2026-02-15 05:59:50.734	0.000000000000000000000000000000	2026-02-15 04:31:36.643
cmlnbnlr3000167q9oen96f4h	cml6ctvlp0017uqrgl43h68pm	2026-02-14 17:00:00	2026-02-15 05:45:37.846	16.455087300000000000000000000000	99.530074799999990000000000000000	-jkouny	QR	2026-02-15 14:01:24.408	16.454771500000000000000000000000	99.530205700000000000000000000000	-jkouny	GPS	APPROVED	7.250000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 05:45:38.271	2026-02-16 00:12:25.331	\N	\N	0.000000000000000000000000000000	\N
cmlndsxrz000ljrmp7axqqd8s	cml6ctvcw000tuqrgj8clzpzz	2026-02-14 17:00:00	2026-02-15 06:45:45.935	16.455067871530660000000000000000	99.530140500346150000000000000000	-oj16l7	QR	2026-02-15 14:14:27.895	16.455160276978370000000000000000	99.530159784573630000000000000000	-oj16l7	GPS	APPROVED	6.470000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 06:45:46.367	2026-02-16 00:12:25.331	\N	\N	0.000000000000000000000000000000	\N
cmlngkg34000113hmttfdq0zp	cml6ctvhm0011uqrgd2s6gv12	2026-02-14 17:00:00	2026-02-15 08:03:08.596	16.455070200000000000000000000000	99.530120400000000000000000000000	4uyosu	QR	2026-02-15 13:57:52.491	16.455091700000000000000000000000	99.530143100000000000000000000000	4uyosu	GPS	APPROVED	4.900000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 08:03:09.041	2026-02-16 00:12:25.331	\N	\N	0.000000000000000000000000000000	\N
cmloocfcp00017jjkkr0gqyc4	cml5g20im0022ua4780xu5bou	2026-02-15 17:00:00	2026-02-16 02:00:00	\N	\N	\N	MANUAL	2026-02-16 13:55:58.151	16.475179500000000000000000000000	99.553656300000000000000000000000	-rrm7pw	GPS	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-16 04:28:37.945	2026-02-16 13:55:58.988	88	2026-02-16 06:00:21.474	0.000000000000000000000000000000	2026-02-16 04:31:56.961
cmlr994bi0005y7gufnp1eiuu	cml6ctvms0019uqrg4ft54y7j	2026-02-17 17:00:00	2026-02-17 23:49:27.302	16.455057900000000000000000000000	99.529909300000000000000000000000	-5m8uqd	QR	2026-02-18 12:06:51.693	16.454976600000000000000000000000	99.530118500000000000000000000000	-tqfgt7	GPS	APPROVED	11.280000000000000000000000000000	3.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 23:50:15.149	2026-02-17 23:49:27.966	2026-02-18 12:06:52.374	60	2026-02-18 06:02:31.932	0.000000000000000000000000000000	2026-02-18 05:01:56.728
cmlrbkdzw0001d2s1wy11wc1a	cml6ctvp6001fuqrgjo0cut8g	2026-02-17 17:00:00	2026-02-18 00:54:12.317	16.455032700000000000000000000000	99.530136100000010000000000000000	-ilt8ll	QR	2026-02-18 10:04:13.526	16.455069700000000000000000000000	99.530173600000000000000000000000	-ilt8ll	GPS	APPROVED	8.170000000000000000000000000000	0.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-18 05:51:26.64	2026-02-18 00:54:12.956	2026-02-18 10:04:14.154	\N	\N	0.000000000000000000000000000000	\N
cmlr79o9i000343ngr4ns2610	cml6ctvhm0011uqrgd2s6gv12	2026-02-17 17:00:00	2026-02-17 22:53:53.903	16.455071700000000000000000000000	99.530011200000000000000000000000	4uyosu	QR	2026-02-18 10:53:29.957	16.455062500000000000000000000000	99.530173199999990000000000000000	4uyosu	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 23:47:49.96	2026-02-17 22:53:54.583	2026-02-18 10:53:30.803	86	2026-02-18 04:28:53.452	0.000000000000000000000000000000	2026-02-18 03:02:04.367
cmlnbj33a000jjrmpq0rmdm2b	cml5cxygj0003v68ql9533bl3	2026-02-14 17:00:00	2026-02-15 05:42:07.029	16.475183900000000000000000000000	99.553657700000000000000000000000	-wfhbzg	QR	2026-02-15 17:42:07.029	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 05:42:07.462	2026-02-18 05:57:26.726	\N	\N	0.000000000000000000000000000000	\N
cmlr92lqt0001141xxqqb2vhe	cml6cv8sm000313l7yhueq5zy	2026-02-17 17:00:00	2026-02-17 23:44:23.311	16.455036000000000000000000000000	99.530147500000000000000000000000	-oka4kb	QR	2026-02-18 10:01:28.581	16.455039600000000000000000000000	99.530021199999990000000000000000	jl0pv7	GPS	APPROVED	9.279999999999999000000000000000	1.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 23:47:10.976	2026-02-17 23:44:23.958	2026-02-18 10:01:29.027	\N	\N	0.000000000000000000000000000000	\N
cmlr76vei000143ng07fukg1i	cml6ctvnx001buqrgfzjexn6r	2026-02-17 17:00:00	2026-02-17 22:51:42.73	16.455087100000000000000000000000	99.530105800000000000000000000000	-3nueuy	QR	2026-02-18 11:47:50.836	16.455092100000000000000000000000	99.529766499999990000000000000000	-3nueuy	GPS	APPROVED	11.930000000000000000000000000000	3.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 23:47:38.502	2026-02-17 22:51:43.866	2026-02-18 11:47:51.473	\N	\N	0.000000000000000000000000000000	\N
cmlrdr2yy0003i6sm0la2hmfy	cml5g20im0022ua4780xu5bou	2026-02-17 17:00:00	2026-02-18 01:56:00	\N	\N	\N	MANUAL	2026-02-18 14:23:56.096	16.475163300000000000000000000000	99.553576699999990000000000000000	-rrm7pw	GPS	APPROVED	11.450000000000000000000000000000	3.450000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-18 01:55:24.491	2026-02-18 14:23:56.936	86	2026-02-18 06:27:21.839	0.000000000000000000000000000000	2026-02-18 05:00:43.357
cmlofmqte0001fbxdrlws7feq	cml6ctuyp0003uqrgejbtvcmm	2026-02-15 17:00:00	2026-02-16 00:24:42.174	16.436247400000000000000000000000	99.512106200000010000000000000000	-w9hfrz	QR	2026-02-16 12:26:15.269	16.436344300000000000000000000000	99.511680600000010000000000000000	-h95foa	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 00:24:42.818	2026-02-17 00:31:59.272	\N	\N	0.000000000000000000000000000000	\N
cmlocob5g0007tl3s8ejosey9	cml6ctv3c000buqrguslcci85	2026-02-15 17:00:00	2026-02-15 23:01:56.331	16.436510820862980000000000000000	99.511739600890860000000000000000	gg44cx	QR	2026-02-16 11:43:00	16.436522749839410000000000000000	99.511672532052900000000000000000	gg44cx	MANUAL	APPROVED	11.680000000000000000000000000000	3.680000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 23:01:56.98	2026-02-21 03:20:40.583	59	2026-02-16 04:04:22.187	0.000000000000000000000000000000	2026-02-16 03:05:20.156
cmlomrret0001exwhoqly04bb	cmlm76c5y0001vdciu64hkooq	2026-02-15 17:00:00	2026-02-16 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-16 10:00:00	\N	\N	\N	ADMIN_BACKFILL	REJECTED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml5w8h240001ugxaadqh8irg	2026-02-16 05:50:57.411	2026-02-16 03:44:34.181	2026-02-21 03:44:36.706	80	2026-02-16 05:50:55.513	0.000000000000000000000000000000	2026-02-16 04:30:44.758
cmlrdt42d0009i6sm0cpx402l	cmlm76c5y0001vdciu64hkooq	2026-02-16 17:00:00	2026-02-17 00:05:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-17 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.920000000000000000000000000000	0.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-18 01:56:59.221	2026-02-21 03:44:36.801	\N	\N	0.000000000000000000000000000000	\N
cmlvtsrl9000x9q919dwr6fyq	cml6ctvhm0011uqrgd2s6gv12	2026-01-31 17:00:00	2026-02-01 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:41.614	2026-02-21 04:35:41.614	\N	\N	0.000000000000000000000000000000	\N
cmlpt353f0001ibyi0tlnl1kq	cml5g22hz002gua47temxhj1t	2026-02-16 17:00:00	2026-02-16 23:29:07.886	16.475189000000000000000000000000	99.553652000000000000000000000000	8dlb91	GPS	2026-02-17 11:31:52.157	16.475188100000000000000000000000	99.553644700000010000000000000000	8dlb91	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:29:09.004	2026-02-17 11:31:53.426	88	2026-02-17 04:31:02.826	0.000000000000000000000000000000	2026-02-17 03:02:10.895
cmlobi1pt0001rtnm8h9od02v	cml6ctvcw000tuqrgj8clzpzz	2026-02-15 17:00:00	2026-02-15 22:29:04.553	16.455244431286210000000000000000	99.530059369373630000000000000000	-oj16l7	QR	2026-02-16 05:55:09.012	16.455132281423040000000000000000	99.530079066846080000000000000000	-oj16l7	GPS	APPROVED	6.430000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:29:05.201	2026-02-16 05:55:09.862	\N	\N	0.000000000000000000000000000000	\N
cmlodermi000hyc3qtsw6eiet	cml6ctvms0019uqrg4ft54y7j	2026-02-15 17:00:00	2026-02-15 23:22:30.75	16.455098200000000000000000000000	99.530085300000000000000000000000	-5m8uqd	QR	2026-02-16 12:07:02.73	16.455055300000000000000000000000	99.530053499999990000000000000000	-tqfgt7	GPS	APPROVED	11.730000000000000000000000000000	3.730000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 23:22:31.386	2026-02-16 12:07:03.399	57	2026-02-16 05:59:08.169	0.000000000000000000000000000000	2026-02-16 05:01:28.245
cmlocgaiu0003tl3sxn9gd7do	cml6ctuzt0005uqrgdnihhrcg	2026-02-15 17:00:00	2026-02-15 22:55:42.27	16.436314200000000000000000000000	99.511913800000000000000000000000	-xuvpf5	QR	2026-02-16 11:02:45.714	16.436365300000000000000000000000	99.511861400000000000000000000000	-xuvpf5	GPS	APPROVED	11.120000000000000000000000000000	3.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:55:42.918	2026-02-16 11:02:46.352	59	2026-02-16 05:04:47.807	0.000000000000000000000000000000	2026-02-16 04:05:12.5
cmlocjod00005yc3qshksdeoo	cml5g289u003uua47ulssk26x	2026-02-15 17:00:00	2026-02-15 22:58:19.692	16.475554000000000000000000000000	99.553506000000000000000000000000	ktr8uu	GPS	2026-02-16 11:00:47.112	16.475294000000000000000000000000	99.553663700000000000000000000000	ktr8uu	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:58:20.82	2026-02-16 11:00:48.037	85	2026-02-16 04:27:06.636	0.000000000000000000000000000000	2026-02-16 03:02:04.645
cmlod6yg4000btl3sm32onp0x	cml6ctv270009uqrg7spxr9d4	2026-02-15 17:00:00	2026-02-15 23:16:26.331	16.436324800000000000000000000000	99.511860900000000000000000000000	4uyosu	QR	2026-02-16 11:43:34.841	16.436285500000000000000000000000	99.511996300000010000000000000000	4uyosu	GPS	APPROVED	11.450000000000000000000000000000	3.450000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 23:16:26.98	2026-02-16 11:43:35.481	0	2026-02-16 06:03:35.192	0.000000000000000000000000000000	2026-02-16 06:03:19.844
cmlof27cq000pyc3qw4n8uol8	cml6ctv0x0007uqrgprf5lu7c	2026-02-15 17:00:00	2026-02-16 00:08:43.825	16.436390864537720000000000000000	99.511789891342430000000000000000	-85vz5c	QR	2026-02-16 12:07:49.973	16.436390864537720000000000000000	99.511789891342430000000000000000	-85vz5c	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-16 00:08:44.475	2026-02-16 12:07:50.613	65	2026-02-16 07:09:36.072	0.000000000000000000000000000000	2026-02-16 06:04:25.76
cmloaxj1v000113b9x431c80u	cml5g1qzg000iua472zcpgugd	2026-02-15 17:00:00	2026-02-15 22:13:06.827	16.475206200000000000000000000000	99.553720700000000000000000000000	-8s2lny	QR	2026-02-16 10:40:23.786	16.475035600000000000000000000000	99.553183000000000000000000000000	ntdgyb	GPS	APPROVED	11.450000000000000000000000000000	3.450000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:13:07.891	2026-02-16 10:40:25.082	87	2026-02-16 05:57:53.956	0.000000000000000000000000000000	2026-02-16 04:30:24.073
cmlodjvj2000dtl3skehtcr52	cml5g1xzx001oua47iy5u23oh	2026-02-15 17:00:00	2026-02-15 23:26:28.646	16.475182900000000000000000000000	99.553635300000000000000000000000	g3up74	QR	2026-02-16 11:30:22.173	16.475125800000000000000000000000	99.553641000000000000000000000000	g3up74	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 23:26:29.726	2026-02-16 11:30:23.041	89	2026-02-16 04:29:56.948	0.000000000000000000000000000000	2026-02-16 03:00:46.878
cmlpvud670001omfbbt6qccql	cml6ctvp6001fuqrgjo0cut8g	2026-02-16 17:00:00	2026-02-17 00:46:17.787	16.455064600000000000000000000000	99.530061100000000000000000000000	-ilt8ll	QR	2026-02-17 10:02:04.082	16.455550600000000000000000000000	99.530281800000000000000000000000	-ilt8ll	GPS	APPROVED	8.250000000000000000000000000000	0.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 00:46:18.415	2026-02-18 00:31:59.293	\N	\N	0.000000000000000000000000000000	\N
cmlptvpq20001tw3ngwqqmk0h	cml6ctuwf0001uqrgn7ktp9je	2026-02-16 17:00:00	2026-02-16 23:51:21.041	16.436228100000000000000000000000	99.512098600000000000000000000000	vr2ul	QR	2026-02-17 10:06:59.323	16.436304100000000000000000000000	99.511871200000000000000000000000	vr2ul	GPS	APPROVED	9.250000000000000000000000000000	1.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:51:22.107	2026-02-17 10:07:00.197	\N	\N	0.000000000000000000000000000000	\N
cmlocb7pm0001tl3slmdjggsd	cml6ctvnx001buqrgfzjexn6r	2026-02-15 17:00:00	2026-02-15 22:51:44.952	16.455223300000000000000000000000	99.529966700000000000000000000000	-3nueuy	QR	2026-02-16 12:10:57.671	16.455112700000000000000000000000	99.529739600000000000000000000000	-3nueuy	GPS	APPROVED	12.320000000000000000000000000000	4.320000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:51:45.994	2026-02-16 12:10:58.33	\N	\N	0.000000000000000000000000000000	\N
cmlorgqv8000511k4ejenav1w	cml6ctveb000vuqrg3ulgugaj	2026-02-15 17:00:00	2026-02-16 05:55:57.273	16.455131300000000000000000000000	99.529926800000000000000000000000	-c3lq7g	QR	2026-02-16 14:35:02.704	16.455040900000000000000000000000	99.530152500000000000000000000000	jnfchk	GPS	APPROVED	7.650000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 06:03:34.715	2026-02-16 05:55:58.34	2026-02-16 14:35:03.398	\N	\N	0.000000000000000000000000000000	\N
cmloixhgf0001lvyu0wyissbr	cml6ctvgi000zuqrguiuyi2de	2026-02-15 17:00:00	2026-02-16 01:57:02.116	16.455079900000000000000000000000	99.530146300000000000000000000000	-1n18s4	QR	2026-02-16 13:54:32.023	16.455122000000000000000000000000	99.530028599999990000000000000000	hl88nd	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 07:28:39.25	2026-02-16 01:57:02.751	2026-02-16 13:54:32.703	87	2026-02-16 07:29:00.598	0.000000000000000000000000000000	2026-02-16 06:01:34.833
cmloeg2yb000lyc3qm14b4bem	cml6cv8sm000313l7yhueq5zy	2026-02-15 17:00:00	2026-02-15 23:51:31.708	16.455092300000000000000000000000	99.530113900000000000000000000000	-oka4kb	QR	2026-02-16 10:01:30.896	16.454976900000000000000000000000	99.530040300000000000000000000000	jl0pv7	GPS	APPROVED	9.150000000000000000000000000000	1.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 23:51:32.339	2026-02-16 10:01:31.524	\N	\N	0.000000000000000000000000000000	\N
cmlogoq8c0007woo4edl2cp9x	cml6ctvp6001fuqrgjo0cut8g	2026-02-15 17:00:00	2026-02-16 00:54:14.342	16.455088400000000000000000000000	99.530119799999990000000000000000	-ilt8ll	QR	2026-02-16 10:02:40.509	16.455018000000000000000000000000	99.530180200000000000000000000000	-ilt8ll	GPS	APPROVED	8.130000000000001000000000000000	0.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 07:28:47.921	2026-02-16 00:54:14.988	2026-02-16 10:02:41.145	\N	\N	0.000000000000000000000000000000	\N
cmlodqkda000htl3sfk2qfsd9	cml6cv8uy000713l7zocqn0fn	2026-02-15 17:00:00	2026-02-15 23:31:40.789	16.475508900000000000000000000000	99.553269900000000000000000000000	-trvj2p	QR	2026-02-16 10:05:41.114	16.475168100000000000000000000000	99.553634100000000000000000000000	-trvj2p	GPS	APPROVED	9.570000000000000000000000000000	1.570000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 23:31:41.854	2026-02-16 10:05:42.003	\N	\N	0.000000000000000000000000000000	\N
cmlodrium000jyc3q8ableckb	cml6ctuwf0001uqrgn7ktp9je	2026-02-15 17:00:00	2026-02-15 23:32:25.465	16.436370900000000000000000000000	99.512094300000000000000000000000	vr2ul	QR	2026-02-16 10:07:45.324	16.436231500000000000000000000000	99.512226500000000000000000000000	vr2ul	GPS	APPROVED	9.580000000000000000000000000000	1.580000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 23:32:26.542	2026-02-16 10:07:46.169	\N	\N	0.000000000000000000000000000000	\N
cmlobrx080005rtnm4m9tb1pc	cml6ctvkk0015uqrg9iuy6dh1	2026-02-15 17:00:00	2026-02-15 22:36:44.979	16.454828054728800000000000000000	99.530325554611120000000000000000	phfpd5	QR	2026-02-16 22:35:43.401	16.455136616117310000000000000000	99.530217804409670000000000000000	phfpd5	GPS	APPROVED	22.970000000000000000000000000000	14.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:36:45.656	2026-02-16 22:35:43.826	\N	\N	0.000000000000000000000000000000	\N
cmlrdrb3w0005i6sm9zc8u1i4	cml5g22hz002gua47temxhj1t	2026-02-17 17:00:00	2026-02-18 01:56:00	\N	\N	\N	MANUAL	2026-02-18 13:56:00	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.)	\N	\N	2026-02-18 01:55:35.037	2026-02-19 01:59:54.147	89	2026-02-18 08:00:47.816	0.000000000000000000000000000000	2026-02-18 06:30:57.329
cmlogncvz0005woo4x3pr5c0m	cml6ctvrh001luqrg60imh1k9	2026-02-15 17:00:00	2026-02-16 00:53:09.958	16.475186000000000000000000000000	99.553649600000000000000000000000	-tvo3gw	GPS	2026-02-16 10:05:01.949	16.475263700000000000000000000000	99.553714600000010000000000000000	-tvo3gw	GPS	APPROVED	8.180000000000000000000000000000	0.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 00:53:11.04	2026-02-17 00:31:59.272	\N	\N	0.000000000000000000000000000000	\N
cmlpyh2og0003a7gu5oc469w5	cml6ctvja0013uqrgbdjr4l0e	2026-02-16 17:00:00	2026-02-17 01:59:56.47	16.455038800000000000000000000000	99.530174700000000000000000000000	-xk7lgp	QR	2026-02-17 13:54:51.584	16.455077400000000000000000000000	99.530054500000010000000000000000	-cvmrg6	GPS	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 01:59:57.136	2026-02-18 00:31:59.293	88	2026-02-17 09:00:47.138	0.000000000000000000000000000000	2026-02-17 07:31:59.073
cmlqidl3y000j2d9denan53hq	cml6ctv5n000fuqrg94t826wg	2026-02-16 17:00:00	2026-02-17 11:17:05.156	16.436315600000000000000000000000	99.512029299999990000000000000000	jzx37b	QR	2026-02-17 23:17:56.048	16.436320600000000000000000000000	99.511871000000000000000000000000	jzx37b	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	17	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 11:17:06.718	2026-02-18 00:31:59.293	\N	\N	0.000000000000000000000000000000	\N
cmlvtss3p000z9q91s6ko8hee	cml6ctvhm0011uqrgd2s6gv12	2026-02-01 17:00:00	2026-02-01 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:42.277	2026-02-21 04:35:42.277	\N	\N	0.000000000000000000000000000000	\N
cmlptyl470005tw3n63jxf078	cml6cv8qd000113l7pz55vip3	2026-02-16 17:00:00	2026-02-16 23:53:34.187	16.455164000000000000000000000000	99.530003800000000000000000000000	-xgf12i	QR	2026-02-17 10:11:45.358	16.455186600000000000000000000000	99.529656700000000000000000000000	-xgf12i	GPS	APPROVED	9.300000000000001000000000000000	1.300000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:53:36.103	2026-02-17 10:11:46.646	\N	\N	0.000000000000000000000000000000	\N
cmlas0uwv0001qhol2v9xnl87	cml6ctv5n000fuqrg94t826wg	2026-02-05 17:00:00	2026-02-06 11:02:49.575	16.436311900000000000000000000000	99.511981000000010000000000000000	jzx37b	QR	2026-02-07 11:02:49.575	\N	\N	\N	\N	APPROVED	24.000000000000000000000000000000	\N	2	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 26 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 11:02:50.24	2026-02-17 11:17:05.825	\N	\N	0.000000000000000000000000000000	\N
cmlvtssg000119q91bw3lh4sh	cml6ctvhm0011uqrgd2s6gv12	2026-02-02 17:00:00	2026-02-02 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:42.721	2026-02-21 04:35:42.721	\N	\N	0.000000000000000000000000000000	\N
cmlpt1dvn000bwxzisw9g84ld	cml5g1xzx001oua47iy5u23oh	2026-02-16 17:00:00	2026-02-16 23:27:45.948	16.475426600000000000000000000000	99.553801600000000000000000000000	g3up74	QR	2026-02-17 11:30:09.67	16.475158800000000000000000000000	99.553719100000000000000000000000	g3up74	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:27:47.075	2026-02-17 11:30:10.562	87	2026-02-17 04:28:01.256	0.000000000000000000000000000000	2026-02-17 03:00:02.483
cmlpuoaos00031wzj2c723ttv	cml6ctvms0019uqrg4ft54y7j	2026-02-16 17:00:00	2026-02-17 00:13:35.022	16.455100100000000000000000000000	99.530077600000000000000000000000	-5m8uqd	QR	2026-02-17 12:10:24.042	16.455148300000000000000000000000	99.530177700000000000000000000000	-tqfgt7	GPS	APPROVED	10.930000000000000000000000000000	2.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-17 00:13:35.645	2026-02-17 12:10:24.69	51	2026-02-17 05:59:05.164	0.000000000000000000000000000000	2026-02-17 05:07:27.084
cmlra00m2000b141xgy7wdifa	cml6ctv0x0007uqrgprf5lu7c	2026-02-17 17:00:00	2026-02-18 00:10:22.213	16.436392081642080000000000000000	99.511789911554440000000000000000	-85vz5c	QR	2026-02-18 12:15:23.257	16.436392081642080000000000000000	99.511789911554440000000000000000	-85vz5c	GPS	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-18 00:10:22.874	2026-02-18 12:15:24.151	63	2026-02-18 06:12:05.757	0.000000000000000000000000000000	2026-02-18 05:08:38.409
cmlr9kb3s0007141xy14huwmy	cml6cv8qd000113l7pz55vip3	2026-02-17 17:00:00	2026-02-17 23:58:08.704	16.455286400000000000000000000000	99.529922700000000000000000000000	-xgf12i	QR	2026-02-18 10:03:05.722	16.455122700000000000000000000000	99.529755100000000000000000000000	-xgf12i	GPS	APPROVED	9.070000000000000000000000000000	1.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:58:09.765	2026-02-18 10:03:06.147	\N	\N	0.000000000000000000000000000000	\N
cmlpvfzl50001pp9gtzip0xzq	cml6ctuyp0003uqrgejbtvcmm	2026-02-16 17:00:00	2026-02-17 00:35:06.977	16.436362800000000000000000000000	99.511727900000000000000000000000	-w9hfrz	QR	2026-02-17 12:35:21.935	16.436271400000000000000000000000	99.512048300000000000000000000000	-w9hfrz	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 00:35:07.625	2026-02-18 00:31:59.293	\N	\N	0.000000000000000000000000000000	\N
cmlpvhzej0003pp9gr0hw97b6	cml6ctva5000nuqrg8wh05sro	2026-02-16 17:00:00	2026-02-17 00:36:40.05	16.436333200000000000000000000000	99.511827900000000000000000000000	10dh5d	QR	2026-02-17 12:36:55.396	16.436301000000000000000000000000	99.511919100000000000000000000000	10dh5d	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 00:36:40.699	2026-02-18 00:31:59.293	\N	\N	0.000000000000000000000000000000	\N
cmlqi55iy000d2d9dmfozwq6z	cml6ctv4g000duqrgdybgtyte	2026-02-16 17:00:00	2026-02-17 11:10:31.317	16.436376200000000000000000000000	99.511832500000000000000000000000	3vnzvo	QR	2026-02-17 23:10:50.345	16.436345500000000000000000000000	99.511893200000000000000000000000	3vnzvo	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	10	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 11:10:33.063	2026-02-18 00:31:59.293	\N	\N	0.000000000000000000000000000000	\N
cmlvtsssc00139q91j0ui2wbx	cml6ctvhm0011uqrgd2s6gv12	2026-02-03 17:00:00	2026-02-03 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:43.164	2026-02-21 04:35:43.164	\N	\N	0.000000000000000000000000000000	\N
cmlr7ur3x000b43ngyiq7mmwy	cml5w8h240001ugxaadqh8irg	2026-02-17 17:00:00	2026-02-17 23:10:17.179	16.475265300000000000000000000000	99.553711400000000000000000000000	vpjg0o	QR	2026-02-18 05:58:38.507	16.475167300000000000000000000000	99.553606500000000000000000000000	vpjg0o	GPS	APPROVED	5.800000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:10:18.045	2026-02-18 05:58:38.932	\N	\N	0.000000000000000000000000000000	\N
cmlr9djep0003141xonm3qqsz	cml5waf57000114p7u4pb0j1l	2026-02-17 17:00:00	2026-02-17 23:52:53.071	16.475520200000000000000000000000	99.553839000000000000000000000000	vr2ul	GPS	2026-02-18 09:56:39.233	16.475440100000000000000000000000	99.553842600000000000000000000000	vr2ul	GPS	APPROVED	9.050000000000001000000000000000	1.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:52:54.145	2026-02-18 09:56:40.076	\N	\N	0.000000000000000000000000000000	\N
cmlqfmcvx00012d9dlk91wu1b	cml6ctvtp001puqrgr6j1clm9	2026-02-16 17:00:00	2026-02-17 09:59:55.983	16.475198500000000000000000000000	99.553844700000000000000000000000	4zl33m	QR	2026-02-18 09:56:56.72	16.475305700000000000000000000000	99.553748500000000000000000000000	4zl33m	GPS	APPROVED	22.950000000000000000000000000000	14.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 09:59:57.117	2026-02-18 09:56:57.141	\N	\N	0.000000000000000000000000000000	\N
cmlr9fnbl0005141x2fw5e8j2	cml6ctuwf0001uqrgn7ktp9je	2026-02-17 17:00:00	2026-02-17 23:54:31.67	16.436300500000000000000000000000	99.512033800000000000000000000000	vr2ul	QR	2026-02-18 10:04:20.426	16.436354800000000000000000000000	99.511870300000000000000000000000	vr2ul	GPS	APPROVED	9.150000000000000000000000000000	1.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:54:32.529	2026-02-18 10:04:21.314	\N	\N	0.000000000000000000000000000000	\N
cmlr97cg30003y7gudvy1dx4c	cml6cv8ts000513l7uydg8j16	2026-02-17 17:00:00	2026-02-17 23:48:04.538	16.475207000000000000000000000000	99.553849900000000000000000000000	-p0zg9d	QR	2026-02-18 10:10:48.606	16.475170900000000000000000000000	99.553725000000000000000000000000	-p0zg9d	GPS	APPROVED	9.369999999999999000000000000000	1.370000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:48:05.187	2026-02-18 10:10:49.266	\N	\N	0.000000000000000000000000000000	\N
cmlopv4tv000130brbmgzf9d7	cml6ctv7w000juqrgh1tdiejn	2026-02-15 17:00:00	2026-02-15 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-16 06:25:00	16.436210200000000000000000000000	99.512185300000000000000000000000	rcqple	ADMIN_BACKFILL	APPROVED	6.420000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-16 05:11:10.387	2026-02-21 04:50:46.36	\N	\N	0.000000000000000000000000000000	\N
cmlvjirmp0009ojwq1u3tw6xd	cml6ctvsk001nuqrgooayfxde	2026-02-20 17:00:00	2026-02-20 23:47:57.814	16.475185600000000000000000000000	99.553633100000000000000000000000	-xk7lgp	GPS	2026-02-21 10:00:37.734	16.475191200000000000000000000000	99.553798200000000000000000000000	-xk7lgp	GPS	APPROVED	9.199999999999999000000000000000	1.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:47:58.946	2026-02-21 10:00:38.397	\N	\N	0.000000000000000000000000000000	\N
cmlqfnvpn0001ry0wwtqbd71u	cml6cv8w4000913l7imruilgz	2026-02-16 17:00:00	2026-02-17 10:01:07.106	16.475185100000000000000000000000	99.553645200000010000000000000000	-7x56ss	QR	2026-02-17 22:01:07.106	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 10:01:08.171	2026-02-22 00:45:06.642	\N	\N	0.000000000000000000000000000000	\N
cmlhdjytq0003ewiw06jhxhis	cml5g20im0022ua4780xu5bou	2026-02-10 17:00:00	2026-02-11 01:52:10.132	16.475176700000000000000000000000	99.553843300000000000000000000000	-nselrn	GPS	2026-02-11 13:52:10.132	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-12 07:23:23.235	2026-02-11 01:52:10.766	2026-02-18 23:25:18.316	\N	\N	0.000000000000000000000000000000	\N
cmlobnf4w0003rtnmss7hoyos	cml6ctvhm0011uqrgd2s6gv12	2026-02-15 17:00:00	2026-02-15 22:33:15.223	16.455108900000000000000000000000	99.530112399999990000000000000000	4uyosu	QR	2026-02-16 10:32:49.764	16.455047900000000000000000000000	99.530184700000010000000000000000	4uyosu	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:33:15.872	2026-02-16 10:32:50.619	88	2026-02-16 04:31:10.652	0.000000000000000000000000000000	2026-02-16 03:03:06.82
cmldn4orb0001i8gwzcjhx8d3	cml6ctv5n000fuqrg94t826wg	2026-02-07 17:00:00	2026-02-08 11:09:08.656	16.436296100000000000000000000000	99.512006000000000000000000000000	jzx37b	QR	2026-02-09 11:09:08.656	\N	\N	\N	\N	APPROVED	24.000000000000000000000000000000	\N	9	\N	50.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 26 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 11:09:09.335	2026-02-16 11:08:05.957	26	2026-02-08 15:32:35.05	0.000000000000000000000000000000	2026-02-08 15:05:57.029
cmlodmkzw000ftl3sszxv4iwp	cml5g1vmh001aua47rlxc2pr1	2026-02-15 17:00:00	2026-02-15 23:28:34.978	16.475199000000000000000000000000	99.553625299999990000000000000000	2hlpr1	QR	2026-02-16 11:32:05.286	16.475217800000000000000000000000	99.553667399999990000000000000000	2hlpr1	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 23:28:36.044	2026-02-16 11:32:06.134	81	2026-02-16 05:51:00.758	0.000000000000000000000000000000	2026-02-16 04:29:48.407
cmlora31q000111k4kszwyuvw	cml6ctvlp0017uqrgl43h68pm	2026-02-15 17:00:00	2026-02-16 05:50:47.114	16.455071200000000000000000000000	99.530073300000000000000000000000	-jkouny	QR	2026-02-16 14:01:12.742	16.454914100000000000000000000000	99.530079200000000000000000000000	-jkouny	GPS	APPROVED	7.170000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 06:03:40.013	2026-02-16 05:50:47.534	2026-02-16 14:01:13.389	\N	\N	0.000000000000000000000000000000	\N
cmlps0gov0001wxziiafhj4s2	cml6ctv3c000buqrguslcci85	2026-02-16 17:00:00	2026-02-16 22:59:03.81	16.436448447547140000000000000000	99.511571223483490000000000000000	gg44cx	QR	2026-02-17 11:11:00	16.436169097155750000000000000000	99.511750926273810000000000000000	gg44cx	MANUAL	APPROVED	11.180000000000000000000000000000	3.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 22:59:04.448	2026-02-21 03:21:01.238	65	2026-02-17 04:10:49.723	0.000000000000000000000000000000	2026-02-17 03:05:05.729
cmlornpig0001t2yk1ur7snns	cml6ctvwy001xuqrgl2hwd8y1	2026-02-15 17:00:00	2026-02-16 00:34:00	16.455052200000000000000000000000	99.530127500000010000000000000000	ymf41f	ADMIN_EDIT	2026-02-16 12:31:21.802	16.455076500000000000000000000000	99.530144800000000000000000000000	ymf41f	GPS	APPROVED	11.956056111111110000000000000000	0.000000000000000000000000000000	451	\N	400.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 06:03:22.294	2026-02-16 06:01:23.176	2026-02-21 03:29:05.957	86	2026-02-16 07:28:26.65	0.000000000000000000000000000000	2026-02-16 06:01:33.999
cmlvl4jyh0001x3si47ieu593	cml6cv8w4000913l7imruilgz	2026-02-20 17:00:00	2026-02-21 00:32:00	\N	\N	\N	MANUAL	2026-02-21 10:00:22.596	16.475178500000000000000000000000	99.553777999999990000000000000000	-x7wv4j	GPS	APPROVED	8.470000000000001000000000000000	0.470000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 00:32:55.049	2026-02-21 10:00:23.259	\N	\N	0.000000000000000000000000000000	\N
cmlockqjp0009yc3q1idtz2cm	cml5w8h240001ugxaadqh8irg	2026-02-15 17:00:00	2026-02-15 22:59:09.661	16.475305600000000000000000000000	99.553638900000000000000000000000	vpjg0o	QR	2026-02-16 10:59:09.661	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-16 07:12:25.33	2026-02-15 22:59:10.31	2026-02-16 23:03:16.719	\N	\N	0.000000000000000000000000000000	\N
cmlpr6vnc0001v457x7rsvf0b	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 17:00:00	2026-02-16 22:36:03.497	16.454898152679610000000000000000	99.530287063033400000000000000000	phfpd5	QR	2026-02-17 06:34:43.224	16.454847769018780000000000000000	99.530342505133650000000000000000	phfpd5	GPS	APPROVED	6.970000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 23:16:45.639	2026-02-16 22:36:04.153	2026-02-17 06:34:43.854	\N	\N	0.000000000000000000000000000000	\N
cml91s17200036dc9oi5gzcyw	cml6ctv7w000juqrgh1tdiejn	2026-02-05 00:00:00	2026-02-05 06:00:21.838	16.436374900000000000000000000000	99.511890600000000000000000000000	rcqple	QR	2026-02-05 18:00:21.838	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-06 07:29:48.365	2026-02-05 06:00:22.286	2026-02-16 23:10:48.366	0	2026-02-05 13:03:24.18	0.000000000000000000000000000000	2026-02-05 13:02:58.282
cmlec879g000314l9ip4upto8	cml6ctveb000vuqrg3ulgugaj	2026-02-08 17:00:00	2026-02-08 22:51:43.263	16.455094000000000000000000000000	99.530166400000000000000000000000	-c3lq7g	QR	2026-02-09 10:51:43.263	\N	\N	\N	\N	REJECTED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.)	cml6ctveb000vuqrg3ulgugaj	2026-02-09 02:03:27.348	2026-02-08 22:51:43.684	2026-02-16 23:14:14.227	\N	\N	0.000000000000000000000000000000	\N
cmlp2l1fo0001awrcwyafrz6f	cml6ctv4g000duqrgdybgtyte	2026-02-15 17:00:00	2026-02-16 11:07:12.943	16.436440800000000000000000000000	99.511858899999990000000000000000	7uvltx	GPS	2026-02-16 23:04:18.663	16.436458500000000000000000000000	99.511827400000000000000000000000	3vnzvo	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	7	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 11:07:14.437	2026-02-17 00:31:59.272	\N	\N	0.000000000000000000000000000000	\N
cmlp2m5vp0003awrc2b247qum	cml6ctv5n000fuqrg94t826wg	2026-02-15 17:00:00	2026-02-16 11:08:05.323	16.436306000000000000000000000000	99.511969100000000000000000000000	jzx37b	QR	2026-02-16 23:05:25.039	16.436272300000000000000000000000	99.511968000000000000000000000000	jzx37b	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	8	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 11:08:06.854	2026-02-17 00:31:59.272	\N	\N	0.000000000000000000000000000000	\N
cmlp498v10003axijuhpczxfz	cml6ctvb9000puqrgafxo42i7	2026-02-15 17:00:00	2026-02-16 11:54:02.365	16.436275300000000000000000000000	99.512115200000000000000000000000	-xgf12i	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 11:54:03.421	2026-02-17 00:31:59.272	\N	\N	0.000000000000000000000000000000	\N
cmlpr3bn50001ymaqneal2yxv	cml6ctvhm0011uqrgd2s6gv12	2026-02-16 17:00:00	2026-02-16 22:33:17.621	16.455117900000000000000000000000	99.530166300000000000000000000000	4uyosu	QR	2026-02-17 10:30:42.281	16.455069900000000000000000000000	99.530131800000010000000000000000	4uyosu	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 23:16:28.117	2026-02-16 22:33:18.257	2026-02-17 10:30:43.127	88	2026-02-17 04:32:56.236	0.000000000000000000000000000000	2026-02-17 03:04:37.444
cmlpqtcvc0001acziv225xrav	cml5g1qzg000iua472zcpgugd	2026-02-16 17:00:00	2026-02-16 22:25:32.157	16.475145200000000000000000000000	99.553703799999990000000000000000	ntdgyb	QR	2026-02-17 10:32:22.383	16.475165200000000000000000000000	99.553651200000000000000000000000	ntdgyb	GPS	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 22:25:33.288	2026-02-17 10:32:23.019	86	2026-02-17 05:57:47.678	0.000000000000000000000000000000	2026-02-17 04:31:11.455
cmlpsklki0001j4oegbegqc47	cml6ctvff000xuqrgvuiy6k2z	2026-02-16 17:00:00	2026-02-16 22:29:00	\N	\N	\N	MANUAL	2026-02-17 11:02:00	\N	\N	\N	MANUAL	APPROVED	11.550000000000000000000000000000	3.550000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 05:54:05.641	2026-02-16 23:14:43.89	2026-02-17 11:02:34.101	81	2026-02-17 05:54:20.728	0.000000000000000000000000000000	2026-02-17 04:33:11.343
cmlp1j5mr0007dc5hckruj78b	cml6ctvz80021uqrghd4qf3t2	2026-02-15 17:00:00	2026-02-16 10:37:45.866	16.475333800000000000000000000000	99.553560000000000000000000000000	-trvj2p	QR	2026-02-16 22:37:45.866	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 10:37:46.947	2026-02-17 10:40:39.524	\N	\N	0.000000000000000000000000000000	\N
cmlprqaax0001yom64ryfm7rh	cml6ctvnx001buqrgfzjexn6r	2026-02-16 17:00:00	2026-02-16 22:51:08.477	16.455069300000000000000000000000	99.530148100000010000000000000000	-3nueuy	QR	2026-02-17 12:12:56.645	16.455079200000000000000000000000	99.529770799999990000000000000000	-3nueuy	GPS	APPROVED	12.350000000000000000000000000000	4.350000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 23:16:50.19	2026-02-16 22:51:09.609	2026-02-17 12:12:57.329	\N	\N	0.000000000000000000000000000000	\N
cmlpsjz6b0009wxzinwdsr54f	cml6ctveb000vuqrg3ulgugaj	2026-02-16 17:00:00	2026-02-16 23:14:13.801	16.455134700000000000000000000000	99.530142900000000000000000000000	-c3lq7g	QR	2026-02-17 05:55:26.946	16.455042400000000000000000000000	99.530170900000000000000000000000	jnfchk	GPS	APPROVED	5.680000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-16 23:16:54.28	2026-02-16 23:14:14.867	2026-02-17 05:55:27.584	\N	\N	0.000000000000000000000000000000	\N
cmlps4bqe0003wxzi4u1786qw	cml6ctuzt0005uqrgdnihhrcg	2026-02-16 17:00:00	2026-02-16 23:02:03.797	16.436327800000000000000000000000	99.511910599999990000000000000000	-xuvpf5	QR	2026-02-17 11:02:58.628	16.436365300000000000000000000000	99.511826700000000000000000000000	-xuvpf5	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:02:04.435	2026-02-17 11:02:59.3	57	2026-02-17 05:09:56.237	0.000000000000000000000000000000	2026-02-17 04:12:13.256
cmlr6qerf0005dey8f3dpuuqb	cml6ctvkk0015uqrg9iuy6dh1	2026-02-17 17:00:00	2026-02-17 22:38:00	\N	\N	\N	MANUAL	2026-02-18 06:46:21.915	16.454893259707010000000000000000	99.530323900338150000000000000000	phfpd5	GPS	APPROVED	7.130000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-17 22:38:55.803	2026-02-18 06:46:22.757	\N	\N	0.000000000000000000000000000000	\N
cmlq6tovr0003dflcvxgz7p2b	cml6ctvlp0017uqrgl43h68pm	2026-02-16 17:00:00	2026-02-17 05:53:42.257	16.455103800000000000000000000000	99.530094899999990000000000000000	-jkouny	QR	2026-02-17 14:01:46.514	16.454765200000000000000000000000	99.530203900000000000000000000000	-jkouny	GPS	APPROVED	7.130000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 11:03:01.551	2026-02-17 05:53:42.712	2026-02-17 14:01:47.152	\N	\N	0.000000000000000000000000000000	\N
cmlq6tkiw0001dflcupxdxgte	cml6ctvcw000tuqrgj8clzpzz	2026-02-16 17:00:00	2026-02-17 05:53:34.745	16.455136723831720000000000000000	99.530113600287150000000000000000	-oj16l7	QR	2026-02-17 14:18:58.08	16.455149492716630000000000000000	99.530123032592090000000000000000	-oj16l7	GPS	APPROVED	7.420000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 11:02:51.662	2026-02-17 05:53:37.065	2026-02-17 14:18:58.724	\N	\N	0.000000000000000000000000000000	\N
cmlrm48hj0001addi01ijk5mh	cml6ctvlp0017uqrgl43h68pm	2026-02-17 17:00:00	2026-02-18 05:49:34.641	16.455104100000000000000000000000	99.530102200000000000000000000000	-jkouny	QR	2026-02-18 14:01:27.392	16.454886100000000000000000000000	99.530115100000000000000000000000	-jkouny	GPS	APPROVED	7.180000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-18 05:50:54.184	2026-02-18 05:49:35.095	2026-02-18 14:01:28.252	\N	\N	0.000000000000000000000000000000	\N
cmlr7im5m000743ngrnr1i9he	cml6ctv3c000buqrguslcci85	2026-02-17 17:00:00	2026-02-17 23:00:50.926	16.436226830405030000000000000000	99.511532110919660000000000000000	gg44cx	QR	2026-02-18 11:11:00	16.436447649456770000000000000000	99.511428357604170000000000000000	gg44cx	MANUAL	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:00:51.754	2026-02-21 03:21:10.753	59	2026-02-18 04:06:12.349	0.000000000000000000000000000000	2026-02-18 03:06:43.025
cmlu1vuy700031q2tuijn8ie0	cml6ctv3c000buqrguslcci85	2026-02-19 17:00:00	2026-02-19 22:46:29.865	16.436606288589830000000000000000	99.511752550239220000000000000000	gg44cx	QR	2026-02-20 11:04:00	16.436046000513710000000000000000	99.511777853277760000000000000000	gg44cx	MANUAL	APPROVED	11.280000000000000000000000000000	3.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 22:46:30.511	2026-02-21 03:21:48.385	65	2026-02-20 04:10:09.127	0.000000000000000000000000000000	2026-02-20 03:05:05.173
cmlbq7xsf0001qafd5m0n8ttg	cml6ctvwy001xuqrgl2hwd8y1	2026-02-06 17:00:00	2026-02-06 22:30:00	16.475179800000000000000000000000	99.553647700000000000000000000000	-wfhbzg	ADMIN_EDIT	2026-02-07 10:30:00	16.455097700000000000000000000000	99.530137500000000000000000000000	-wfhbzg	ADMIN_EDIT	APPROVED	12.000000000000000000000000000000	161.600000000000000000000000000000	270	\N	250.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-08 07:29:51.278	2026-02-07 03:00:07.503	2026-02-21 03:25:08.948	84	2026-02-07 04:25:43.844	0.000000000000000000000000000000	2026-02-07 03:00:57.222
cmlvrsfnz0001ur21mlvotxpm	cml6ctvwy001xuqrgl2hwd8y1	2026-01-25 17:00:00	2026-01-25 22:30:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:39:26.927	2026-02-21 03:39:26.927	\N	\N	0.000000000000000000000000000000	\N
cmlvk9wj8000fojwq490ak1mj	cml6cv8qd000113l7pz55vip3	2026-02-20 17:00:00	2026-02-21 00:09:03.769	16.455132400000000000000000000000	99.530129900000010000000000000000	-xgf12i	QR	2026-02-21 10:12:39.517	16.455051200000000000000000000000	99.529697900000000000000000000000	-xgf12i	GPS	APPROVED	9.050000000000001000000000000000	1.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-21 00:09:05.012	2026-02-21 10:12:40.191	\N	\N	0.000000000000000000000000000000	\N
cmlvk8oes000n11by2ah3m1rf	cml6ctvms0019uqrg4ft54y7j	2026-02-20 17:00:00	2026-02-21 00:08:07.165	16.454981300000000000000000000000	99.529859100000000000000000000000	-5m8uqd	QR	2026-02-21 12:01:54.114	16.454966000000000000000000000000	99.530074799999990000000000000000	-y6am8r	GPS	APPROVED	10.880000000000000000000000000000	2.880000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-21 00:08:07.828	2026-02-21 12:01:54.948	62	2026-02-21 06:02:41.304	0.000000000000000000000000000000	2026-02-21 05:00:40.468
cmlvrtfzy0001ggqes6yyvpqj	cml6ctvgi000zuqrguiuyi2de	2026-01-25 17:00:00	2026-01-25 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:40:13.806	2026-02-21 04:17:49.666	\N	\N	0.000000000000000000000000000000	\N
cmlvrtoi60003ggqe64dv2b8w	cml6ctvgi000zuqrguiuyi2de	2026-01-26 17:00:00	2026-01-26 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 04:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	5.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:40:25.038	2026-02-21 04:17:50.345	\N	\N	0.000000000000000000000000000000	\N
cmlvru2kv0005ggqetnksghpl	cml6ctvgi000zuqrguiuyi2de	2026-01-27 17:00:00	2026-01-27 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:40:43.279	2026-02-21 04:17:50.798	\N	\N	0.000000000000000000000000000000	\N
cmlvru9vq0007ggqeaftj7zzk	cml6ctvgi000zuqrguiuyi2de	2026-01-28 17:00:00	2026-01-28 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:40:52.742	2026-02-21 04:17:51.252	\N	\N	0.000000000000000000000000000000	\N
cmlvrukxf0003ur21aluu6ocs	cml6ctvgi000zuqrguiuyi2de	2026-01-29 17:00:00	2026-01-29 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:41:07.059	2026-02-21 04:17:51.705	\N	\N	0.000000000000000000000000000000	\N
cmlvrutx80005ur21vwwjppo6	cml6ctvgi000zuqrguiuyi2de	2026-01-30 17:00:00	2026-01-30 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:41:18.716	2026-02-21 04:17:52.158	\N	\N	0.000000000000000000000000000000	\N
cmla8h9tt00012dpddxgm4lm3	cml6ctvgi000zuqrguiuyi2de	2026-02-05 17:00:00	2026-02-06 02:00:00	16.455100100000000000000000000000	99.530131000000000000000000000000	-1n18s4	ADMIN_BACKFILL	2026-02-06 14:00:00	16.455065300000000000000000000000	99.530139800000000000000000000000	uhdjac	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-06 13:56:26.341	2026-02-06 01:55:43.745	2026-02-21 04:17:54.882	89	2026-02-06 07:31:12.824	0.000000000000000000000000000000	2026-02-06 06:01:28
cmlbny54a0003rvl2qpztn2av	cml6ctvgi000zuqrguiuyi2de	2026-02-06 17:00:00	2026-02-07 02:00:00	16.455091400000000000000000000000	99.530129500000000000000000000000	-1n18s4	ADMIN_BACKFILL	2026-02-07 14:00:00	16.455090100000000000000000000000	99.530089100000000000000000000000	hl88nd	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-07 10:10:10.77	2026-02-07 01:56:31.211	2026-02-21 04:17:55.335	\N	\N	0.000000000000000000000000000000	2026-02-07 06:00:46.159
cmlvtst4n00159q91v433qxlm	cml6ctvhm0011uqrgd2s6gv12	2026-02-04 17:00:00	2026-02-04 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:43.607	2026-02-21 04:35:43.607	\N	\N	0.000000000000000000000000000000	\N
cmlvtzicp000hs33yimjj0khb	cml6ctvja0013uqrgbdjr4l0e	2026-02-03 17:00:00	2026-02-04 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:56.233	2026-02-21 04:40:56.233	\N	\N	0.000000000000000000000000000000	\N
cmlvtzioh000js33ymiphh434	cml6ctvja0013uqrgbdjr4l0e	2026-02-04 17:00:00	2026-02-05 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 14:03:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:56.657	2026-02-21 04:40:56.657	\N	\N	0.000000000000000000000000000000	\N
cmlvu49qd00031cocd0xaltix	cml6cv8sm000313l7yhueq5zy	2026-01-31 17:00:00	2026-02-01 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:38.341	2026-02-21 04:44:38.341	\N	\N	0.000000000000000000000000000000	\N
cmlvu4a8200051cocg9tpjuel	cml6cv8sm000313l7yhueq5zy	2026-02-01 17:00:00	2026-02-02 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:38.979	2026-02-21 04:44:38.979	\N	\N	0.000000000000000000000000000000	\N
cmlvu4ajx00071coczskvxo03	cml6cv8sm000313l7yhueq5zy	2026-02-02 17:00:00	2026-02-03 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:39.405	2026-02-21 04:44:39.405	\N	\N	0.000000000000000000000000000000	\N
cmlvu4avr00091coc9cxxmu62	cml6cv8sm000313l7yhueq5zy	2026-02-03 17:00:00	2026-02-04 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:39.831	2026-02-21 04:44:39.831	\N	\N	0.000000000000000000000000000000	\N
cmlrxg0i3000dr57gxak3vsmt	cml6ctv5n000fuqrg94t826wg	2026-02-17 17:00:00	2026-02-18 11:06:38.927	16.436339900000000000000000000000	99.511925199999990000000000000000	jzx37b	QR	2026-02-18 23:04:07.13	16.436364700000000000000000000000	99.511798700000000000000000000000	jzx37b	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 11:06:40.395	2026-02-19 00:31:59.241	\N	\N	0.000000000000000000000000000000	\N
cmluh5plq000146syyu2ktce0	cml6ctveb000vuqrg3ulgugaj	2026-02-19 17:00:00	2026-02-20 05:54:03.697	16.455079800000000000000000000000	99.530076700000000000000000000000	-g2tc5p	QR	2026-02-20 14:47:47.944	16.454808000000000000000000000000	99.530113800000000000000000000000	jnfchk	GPS	APPROVED	7.880000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 05:54:04.155	2026-02-21 00:51:17.252	\N	\N	0.000000000000000000000000000000	\N
cmluh5zry000130564sluuuw1	cml6ctvlp0017uqrgl43h68pm	2026-02-19 17:00:00	2026-02-20 05:54:17.098	16.455103400000000000000000000000	99.530109900000000000000000000000	-jkouny	QR	2026-02-20 14:01:24.946	16.454812600000000000000000000000	99.530189699999990000000000000000	-jkouny	GPS	APPROVED	7.120000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 05:54:17.567	2026-02-21 00:51:17.252	\N	\N	0.000000000000000000000000000000	\N
cmlvi85rs000d11byfrycj5dj	cml6ctv7w000juqrgh1tdiejn	2026-02-20 17:00:00	2026-02-20 23:11:43.769	16.436243100000000000000000000000	99.512069500000000000000000000000	rcqple	QR	2026-02-21 06:28:24.237	16.436423000000000000000000000000	99.511596400000000000000000000000	rcqple	GPS	APPROVED	6.270000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:11:44.44	2026-02-21 06:28:25.073	\N	\N	0.000000000000000000000000000000	\N
cmlvhtxap0007o5v750nokfxm	cml6ctuzt0005uqrgdnihhrcg	2026-02-20 17:00:00	2026-02-20 23:00:39.628	16.436284100000000000000000000000	99.511793700000000000000000000000	-xuvpf5	QR	2026-02-21 11:04:50.242	16.436395800000000000000000000000	99.511603200000000000000000000000	-xuvpf5	GPS	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:00:40.273	2026-02-21 11:04:50.91	60	2026-02-21 05:05:10.847	0.000000000000000000000000000000	2026-02-21 04:04:59.753
cmlvgjkpa0003g280x3r2ospd	cml5g20im0022ua4780xu5bou	2026-02-20 17:00:00	2026-02-20 22:24:35.123	16.475171100000000000000000000000	99.553697799999990000000000000000	-rrm7pw	GPS	2026-02-21 10:37:01.757	16.474997300000000000000000000000	99.553706400000000000000000000000	-rrm7pw	GPS	APPROVED	11.200000000000000000000000000000	3.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 22:24:37.775	2026-02-21 10:37:03.217	88	2026-02-21 04:29:13.21	0.000000000000000000000000000000	2026-02-21 03:00:43.809
cmlvrh175000xv692or29az6c	cml6ctvwy001xuqrgl2hwd8y1	2026-02-16 17:00:00	2026-02-17 00:30:00	\N	\N	\N	MANUAL	2026-02-17 02:35:00	\N	\N	\N	MANUAL	APPROVED	1.080000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:30:34.961	2026-02-21 03:30:54.367	\N	\N	0.000000000000000000000000000000	\N
cmlvhucpe000711bygqtto7xq	cml6ctvnx001buqrgfzjexn6r	2026-02-20 17:00:00	2026-02-20 23:00:59.586	16.455085000000000000000000000000	99.530015000000010000000000000000	-3nueuy	QR	2026-02-21 12:07:44.581	16.455090500000000000000000000000	99.529754999999990000000000000000	-3nueuy	GPS	APPROVED	12.100000000000000000000000000000	4.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:01:00.242	2026-02-21 12:07:45.439	\N	\N	0.000000000000000000000000000000	\N
cmlvkflu3000hojwqohnktl16	cml6ctvqa001huqrgn8fa8qe5	2026-02-20 17:00:00	2026-02-21 00:13:30.452	16.455061400000000000000000000000	99.530178100000000000000000000000	c4n38v	QR	2026-02-21 05:09:42.623	16.454970300000000000000000000000	99.530282099999990000000000000000	c4n38v	GPS	APPROVED	3.930000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-21 00:13:31.083	2026-02-21 05:09:43.315	\N	\N	0.000000000000000000000000000000	\N
cmlvtj5mt0001ez6la5vuwqst	cml6ctvff000xuqrgvuiy6k2z	2026-01-25 17:00:00	2026-01-26 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:13.253	2026-02-21 04:28:13.253	\N	\N	0.000000000000000000000000000000	\N
cmlvtj64s0003ez6leuotx6ms	cml6ctvff000xuqrgvuiy6k2z	2026-01-26 17:00:00	2026-01-27 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:13.9	2026-02-21 04:28:13.9	\N	\N	0.000000000000000000000000000000	\N
cmlvtj6gr0005ez6lf942ut81	cml6ctvff000xuqrgvuiy6k2z	2026-01-28 17:00:00	2026-01-29 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:14.331	2026-02-21 04:28:14.331	\N	\N	0.000000000000000000000000000000	\N
cmlvtj6sq0007ez6lokohbq24	cml6ctvff000xuqrgvuiy6k2z	2026-01-29 17:00:00	2026-01-30 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:14.763	2026-02-21 04:28:14.763	\N	\N	0.000000000000000000000000000000	\N
cmlvtj74q0009ez6loealjp46	cml6ctvff000xuqrgvuiy6k2z	2026-01-30 17:00:00	2026-01-31 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:15.194	2026-02-21 04:28:15.194	\N	\N	0.000000000000000000000000000000	\N
cmlvtj7gt000bez6lzxy0rdci	cml6ctvff000xuqrgvuiy6k2z	2026-01-31 17:00:00	2026-02-01 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:15.629	2026-02-21 04:28:15.629	\N	\N	0.000000000000000000000000000000	\N
cmlvtj7sx000dez6lbmgib3pu	cml6ctvff000xuqrgvuiy6k2z	2026-02-01 17:00:00	2026-02-01 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:16.066	2026-02-21 04:28:16.066	\N	\N	0.000000000000000000000000000000	\N
cmlvtj84x000fez6lud6vql8g	cml6ctvff000xuqrgvuiy6k2z	2026-02-02 17:00:00	2026-02-02 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:16.497	2026-02-21 04:28:16.497	\N	\N	0.000000000000000000000000000000	\N
cmlvhetx3000111bybstalx0g	cml6ctv3c000buqrguslcci85	2026-02-20 17:00:00	2026-02-20 22:48:55.41	16.436646782372480000000000000000	99.511633668858440000000000000000	gg44cx	QR	2026-02-21 11:14:06.994	16.436524516639470000000000000000	99.511673555367110000000000000000	gg44cx	GPS	APPROVED	11.420000000000000000000000000000	3.420000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 22:48:56.055	2026-02-21 11:14:07.875	56	2026-02-21 04:04:06.9	0.000000000000000000000000000000	2026-02-21 03:07:57.251
cmlvlfvx9000r11byypopwcs9	cml6ctva5000nuqrg8wh05sro	2026-02-20 17:00:00	2026-02-21 00:41:43.12	16.436435000000000000000000000000	99.511561700000000000000000000000	10dh5d	QR	2026-02-21 12:43:01.24	16.436306700000000000000000000000	99.511894600000010000000000000000	10dh5d	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-21 00:41:43.773	2026-02-21 12:43:02.088	\N	\N	0.000000000000000000000000000000	\N
cmlvhfm610001o5v7ouccfo6d	cml6ctvkk0015uqrg9iuy6dh1	2026-02-20 17:00:00	2026-02-20 22:49:32.009	16.454895663152850000000000000000	99.530320392889560000000000000000	phfpd5	QR	2026-02-21 06:46:42.111	16.454841473781190000000000000000	99.530357628973960000000000000000	phfpd5	GPS	APPROVED	6.950000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 22:49:32.665	2026-02-21 06:46:43.004	\N	\N	0.000000000000000000000000000000	\N
cmlvhtpf80005o5v7bv2zalrr	cml5w8h240001ugxaadqh8irg	2026-02-20 17:00:00	2026-02-20 23:00:29.422	16.475297900000000000000000000000	99.553576300000000000000000000000	vpjg0o	QR	2026-02-21 07:36:55.918	16.475075000000000000000000000000	99.553564499999990000000000000000	vpjg0o	GPS	APPROVED	7.600000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:00:30.068	2026-02-21 07:36:56.542	\N	\N	0.000000000000000000000000000000	\N
cmlvk4i84000dojwqylv3fs4q	cml6cv8sm000313l7yhueq5zy	2026-02-20 17:00:00	2026-02-21 00:04:52.567	16.455074400000000000000000000000	99.530095500000000000000000000000	-oka4kb	QR	2026-02-21 10:01:30.684	16.454865100000000000000000000000	99.530153900000000000000000000000	jl0pv7	GPS	APPROVED	8.930000000000000000000000000000	0.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-21 00:04:53.189	2026-02-21 10:01:31.31	\N	\N	0.000000000000000000000000000000	\N
cmlvl65ma0003x3sixw7eikn4	cml6ctvrh001luqrg60imh1k9	2026-02-20 17:00:00	2026-02-21 00:34:07.994	16.475513300000000000000000000000	99.553843000000000000000000000000	-xuvpf5	GPS	2026-02-21 10:01:58.423	16.475009700000000000000000000000	99.553068100000000000000000000000	-xuvpf5	GPS	APPROVED	8.449999999999999000000000000000	0.450000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-21 00:34:09.778	2026-02-21 10:01:59.05	\N	\N	0.000000000000000000000000000000	\N
cmlvjpvxk000l11by67apnkk3	cml6ctuwf0001uqrgn7ktp9je	2026-02-20 17:00:00	2026-02-20 23:53:30.45	16.436205200000000000000000000000	99.512039400000010000000000000000	vr2ul	QR	2026-02-21 10:11:42.494	16.436217600000000000000000000000	99.512215100000010000000000000000	vr2ul	GPS	APPROVED	9.300000000000001000000000000000	1.300000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:53:31.112	2026-02-21 10:11:43.121	\N	\N	0.000000000000000000000000000000	\N
cmlvgu0uj0005g2804ekum4dh	cml6ctvhm0011uqrgd2s6gv12	2026-02-20 17:00:00	2026-02-20 22:32:44.618	16.455041400000000000000000000000	99.530186099999990000000000000000	4uyosu	QR	2026-02-21 10:32:08.213	16.455060000000000000000000000000	99.530167100000000000000000000000	4uyosu	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 22:32:45.26	2026-02-21 10:32:09.079	86	2026-02-21 04:28:51.487	0.000000000000000000000000000000	2026-02-21 03:02:07.035
cmlvlewgb000p11by5fss0zfi	cml6ctuyp0003uqrgejbtvcmm	2026-02-20 17:00:00	2026-02-21 00:40:57.166	16.436410500000000000000000000000	99.511787000000000000000000000000	ysf08w	QR	2026-02-21 12:43:04.338	16.436346100000000000000000000000	99.511933099999990000000000000000	ysf08w	GPS	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-21 00:40:57.803	2026-02-21 12:43:05.173	\N	\N	0.000000000000000000000000000000	\N
cmlvlv7bp0005x3siq1r0scam	cml6ctvp6001fuqrgjo0cut8g	2026-02-20 17:00:00	2026-02-21 00:53:37.759	16.455095400000000000000000000000	99.530115700000000000000000000000	-ilt8ll	QR	2026-02-21 10:08:30.987	16.455170500000000000000000000000	99.530437400000000000000000000000	-ilt8ll	GPS	APPROVED	8.230000000000000000000000000000	0.230000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 00:53:38.389	2026-02-22 00:41:03.355	\N	\N	0.000000000000000000000000000000	\N
cmlr9pmqa0009141xgn4cm1f1	cml6ctvsk001nuqrgooayfxde	2026-02-17 17:00:00	2026-02-18 00:02:16.328	16.475189500000000000000000000000	99.553649900000000000000000000000	-xk7lgp	QR	2026-02-18 23:56:54.385	16.475385800000000000000000000000	99.553755200000000000000000000000	-xk7lgp	GPS	APPROVED	22.900000000000000000000000000000	14.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-18 00:02:18.322	2026-02-18 23:56:55.054	\N	\N	0.000000000000000000000000000000	\N
cmlrasuyn0003xi7jzgs3l44b	cml6ctva5000nuqrg8wh05sro	2026-02-17 17:00:00	2026-02-18 00:32:47.935	16.436304800000000000000000000000	99.511857900000000000000000000000	10dh5d	QR	2026-02-18 12:33:20.782	16.436341800000000000000000000000	99.511949500000000000000000000000	10dh5d	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 00:32:48.576	2026-02-19 00:31:59.241	\N	\N	0.000000000000000000000000000000	\N
cmlratiuv0003xucttg99pgqk	cml6ctvrh001luqrg60imh1k9	2026-02-17 17:00:00	2026-02-18 00:33:18.467	16.475098800000000000000000000000	99.553749200000000000000000000000	-tvo3gw	QR	2026-02-18 10:21:39.466	16.475042100000000000000000000000	99.553208600000000000000000000000	-tvo3gw	GPS	APPROVED	8.800000000000001000000000000000	0.800000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 00:33:19.543	2026-02-19 00:31:59.241	\N	\N	0.000000000000000000000000000000	\N
cmlrmecxg0001z9zgof09unl3	cml5cxygj0003v68ql9533bl3	2026-02-17 17:00:00	2026-02-18 05:57:26.302	16.475198100000000000000000000000	99.553657400000010000000000000000	ymf41f	QR	2026-02-18 14:21:05.185	16.475225900000000000000000000000	99.553850700000000000000000000000	ymf41f	GPS	APPROVED	7.380000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 05:57:27.413	2026-02-19 00:31:59.241	\N	\N	0.000000000000000000000000000000	\N
cmlrxj06z0007108ihae7ijux	cml6ctv4g000duqrgdybgtyte	2026-02-17 17:00:00	2026-02-18 11:08:58.467	16.436267600000000000000000000000	99.511947500000010000000000000000	3vnzvo	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 11:08:59.963	2026-02-19 00:31:59.241	\N	\N	0.000000000000000000000000000000	\N
cmlrv04nt0001vywpe0ktsn6f	cml6ctvtp001puqrgr6j1clm9	2026-02-17 17:00:00	2026-02-18 09:58:19.212	16.475305500000000000000000000000	99.553800900000000000000000000000	4zl33m	QR	2026-02-18 09:59:03.071	16.475172300000000000000000000000	99.553641600000010000000000000000	4zl33m	GPS	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 09:58:20.057	2026-02-19 00:31:59.241	\N	\N	0.000000000000000000000000000000	\N
cmlsmubds00038v2vqxoxq9l5	cml6ctvnx001buqrgfzjexn6r	2026-02-18 17:00:00	2026-02-18 22:57:37.399	16.455076400000000000000000000000	99.530116699999990000000000000000	-3nueuy	QR	2026-02-19 12:04:07.066	16.455107000000000000000000000000	99.529749700000000000000000000000	-3nueuy	GPS	APPROVED	12.100000000000000000000000000000	4.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 22:57:38.08	2026-02-19 12:04:07.753	\N	\N	0.000000000000000000000000000000	\N
cmlrwjg2h000br57gvwsf7qyo	cml6ctvz80021uqrghd4qf3t2	2026-02-17 17:00:00	2026-02-18 10:41:19.452	16.475151000000000000000000000000	99.553772400000000000000000000000	-trvj2p	QR	2026-02-18 22:41:19.452	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 10:41:20.921	2026-02-19 10:47:43.973	\N	\N	0.000000000000000000000000000000	\N
cmlsm0x9a00014kjh6zemval4	cml6ctveb000vuqrg3ulgugaj	2026-02-18 17:00:00	2026-02-18 22:34:45.404	16.455100200000000000000000000000	99.530121900000000000000000000000	-g2tc5p	QR	2026-02-19 06:01:33.679	16.455094400000000000000000000000	99.529832799999990000000000000000	jnfchk	GPS	APPROVED	6.430000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 22:34:46.75	2026-02-19 06:01:34.312	\N	\N	0.000000000000000000000000000000	\N
cmlsntx3u0003o6ksoaj1ai9v	cml5g20im0022ua4780xu5bou	2026-02-18 17:00:00	2026-02-18 23:25:17.658	16.475128300000000000000000000000	99.553759200000000000000000000000	-rrm7pw	QR	2026-02-19 11:32:12.389	16.475162900000000000000000000000	99.553624900000000000000000000000	-rrm7pw	GPS	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:25:19.194	2026-02-19 11:32:13.029	87	2026-02-19 04:30:55.863	0.000000000000000000000000000000	2026-02-19 03:03:03.463
cmlsq6roa0001jncrz09ih8uy	cml6ctvwy001xuqrgl2hwd8y1	2026-02-18 17:00:00	2026-02-19 00:31:16.836	16.455014300000000000000000000000	99.530110400000000000000000000000	ymf41f	GPS	2026-02-19 06:30:19.817	16.455088800000000000000000000000	99.530157800000000000000000000000	ymf41f	GPS	APPROVED	4.980000000000000000000000000000	0.000000000000000000000000000000	121	\N	150.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-19 00:31:17.914	2026-02-19 06:30:21.111	\N	\N	0.000000000000000000000000000000	\N
cmlsmsq6200018v2v66fl5oq7	cml6ctuzt0005uqrgdnihhrcg	2026-02-18 17:00:00	2026-02-18 22:56:23.257	16.436631700000000000000000000000	99.511791700000000000000000000000	-xuvpf5	QR	2026-02-19 11:05:10.539	16.436358200000000000000000000000	99.511839800000000000000000000000	-xuvpf5	GPS	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 22:56:23.93	2026-02-19 11:05:11.21	58	2026-02-19 03:59:50.441	0.000000000000000000000000000000	2026-02-19 03:01:23.886
cmlsphbyj000bj798lrj6225q	cml6ctv0x0007uqrgprf5lu7c	2026-02-18 17:00:00	2026-02-19 00:11:30.509	16.436395892181130000000000000000	99.511789424514320000000000000000	-85vz5c	QR	2026-02-19 12:10:09.802	16.436395892181130000000000000000	99.511789424514320000000000000000	-85vz5c	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-19 00:11:31.148	2026-02-19 12:10:10.445	63	2026-02-19 06:08:21.388	0.000000000000000000000000000000	2026-02-19 05:04:32.629
cmlsn0bvx00058v2vkv4fbv1p	cml5w8h240001ugxaadqh8irg	2026-02-18 17:00:00	2026-02-18 23:02:18.007	16.475319900000000000000000000000	99.553885500000010000000000000000	vpjg0o	QR	2026-02-19 23:01:35.249	16.475426000000000000000000000000	99.553569499999990000000000000000	vpjg0o	GPS	APPROVED	22.980000000000000000000000000000	14.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:02:18.669	2026-02-19 23:01:35.714	\N	\N	0.000000000000000000000000000000	\N
cmlsm6rlb0003tax2bb248lin	cml6ctvkk0015uqrg9iuy6dh1	2026-02-18 17:00:00	2026-02-18 22:39:18.438	16.454896478115290000000000000000	99.530300431957060000000000000000	phfpd5	QR	2026-02-19 06:50:18.073	16.455044659134820000000000000000	99.530248029781800000000000000000	phfpd5	GPS	APPROVED	7.170000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 22:39:19.118	2026-02-19 06:50:18.712	\N	\N	0.000000000000000000000000000000	\N
cmlsorh6x0003j7985716ubij	cml5waf57000114p7u4pb0j1l	2026-02-18 17:00:00	2026-02-18 23:51:23.16	16.475353100000000000000000000000	99.553438900000000000000000000000	vr2ul	GPS	2026-02-19 09:57:10.726	16.475535000000000000000000000000	99.553831100000000000000000000000	vr2ul	GPS	APPROVED	9.080000000000000000000000000000	1.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:51:24.873	2026-02-19 09:57:11.627	\N	\N	0.000000000000000000000000000000	\N
cmlsp55zc0001korlk6ezjc6o	cml6ctvtp001puqrgr6j1clm9	2026-02-18 17:00:00	2026-02-19 00:02:02.859	16.475296000000000000000000000000	99.553870300000000000000000000000	4zl33m	QR	2026-02-19 09:57:53.643	16.475600200000000000000000000000	99.554117300000000000000000000000	4zl33m	GPS	APPROVED	8.920000000000000000000000000000	0.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-19 00:02:03.528	2026-02-19 09:57:54.772	\N	\N	0.000000000000000000000000000000	\N
cmlsp0eei000310xhiseagaa6	cml6ctvsk001nuqrgooayfxde	2026-02-18 17:00:00	2026-02-18 23:58:20.06	16.475158600000000000000000000000	99.553614400000000000000000000000	-xk7lgp	QR	2026-02-19 10:00:18.523	16.475181000000000000000000000000	99.553620900000000000000000000000	-xk7lgp	GPS	APPROVED	9.020000000000000000000000000000	1.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:58:21.163	2026-02-19 10:00:19.197	\N	\N	0.000000000000000000000000000000	\N
cmlspj1yk000dj7989xbw2s7y	cml6ctvqa001huqrgn8fa8qe5	2026-02-18 17:00:00	2026-02-19 00:12:50.861	16.455120100000000000000000000000	99.530170799999990000000000000000	c4n38v	QR	2026-02-19 10:01:08.634	16.455025900000000000000000000000	99.529856400000000000000000000000	c4n38v	GPS	APPROVED	8.800000000000001000000000000000	0.800000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-19 00:12:51.5	2026-02-19 10:01:09.534	\N	\N	0.000000000000000000000000000000	\N
cmlsorm5z0005j798qwxjj6e8	cml6cv8sm000313l7yhueq5zy	2026-02-18 17:00:00	2026-02-18 23:51:30.674	16.455095500000000000000000000000	99.530153400000000000000000000000	-oka4kb	QR	2026-02-19 10:01:41.394	16.455075200000000000000000000000	99.530050700000000000000000000000	jl0pv7	GPS	APPROVED	9.170000000000000000000000000000	1.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:51:31.319	2026-02-19 10:01:42.252	\N	\N	0.000000000000000000000000000000	\N
cmlsnpvtn0001o6kscskcl22w	cml6cv8uy000713l7zocqn0fn	2026-02-18 17:00:00	2026-02-18 23:22:09.139	16.475423500000000000000000000000	99.553651300000000000000000000000	-trvj2p	QR	2026-02-19 10:04:37.187	16.475205900000000000000000000000	99.553713900000010000000000000000	-trvj2p	GPS	APPROVED	9.699999999999999000000000000000	1.700000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:22:10.907	2026-02-19 10:04:37.834	\N	\N	0.000000000000000000000000000000	\N
cmlsooft30001j798h57fjhc6	cml6cv8ts000513l7uydg8j16	2026-02-18 17:00:00	2026-02-18 23:49:02.401	16.475305300000000000000000000000	99.553578900000010000000000000000	-t0727m	QR	2026-02-19 10:20:33.186	16.475212100000000000000000000000	99.553857500000010000000000000000	-t0727m	GPS	APPROVED	9.520000000000000000000000000000	1.520000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:49:03.111	2026-02-19 10:20:33.821	\N	\N	0.000000000000000000000000000000	\N
cmlslyjmx0001tax22ctd81wf	cml6ctvhm0011uqrgd2s6gv12	2026-02-18 17:00:00	2026-02-18 22:32:55.098	16.455081300000000000000000000000	99.530136500000000000000000000000	4uyosu	QR	2026-02-19 10:31:19.657	16.455087000000000000000000000000	99.530143600000000000000000000000	4uyosu	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 22:32:55.785	2026-02-19 10:31:20.554	87	2026-02-19 04:31:09.231	0.000000000000000000000000000000	2026-02-19 03:03:09.626
cmlvtr0me0001ttch3442wtcn	cml6ctvff000xuqrgvuiy6k2z	2026-02-20 17:00:00	2026-02-20 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-21 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvwy001xuqrgl2hwd8y1	2026-02-21 11:03:18.122	2026-02-21 04:34:20.006	2026-02-22 06:11:31.347	82	2026-02-21 05:56:55.597	0.000000000000000000000000000000	2026-02-21 04:34:36.961
cmlvtzflb0001s33yt5tq5cb7	cml6ctvja0013uqrgbdjr4l0e	2026-01-25 17:00:00	2026-01-25 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:52.655	2026-02-21 04:40:52.655	\N	\N	0.000000000000000000000000000000	\N
cmlu146510001mdup21uhowse	cml6ctvcw000tuqrgj8clzpzz	2026-02-19 17:00:00	2026-02-19 22:24:57.98	16.455159690245150000000000000000	99.530102619994000000000000000000	-8fqk0r	QR	2026-02-20 05:55:18.793	16.455138064936230000000000000000	99.530119299981310000000000000000	-8fqk0r	GPS	APPROVED	6.500000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-19 22:25:24.875	2026-02-19 22:24:58.645	2026-02-20 05:55:19.642	\N	\N	0.000000000000000000000000000000	\N
cmlvtzg2t0003s33yrufu22j4	cml6ctvja0013uqrgbdjr4l0e	2026-01-26 17:00:00	2026-01-26 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:53.285	2026-02-21 04:40:53.285	\N	\N	0.000000000000000000000000000000	\N
cmlu1najl00011q2ta68cheya	cml6ctvkk0015uqrg9iuy6dh1	2026-02-19 17:00:00	2026-02-19 22:39:50.174	16.454909517289480000000000000000	99.530307033653000000000000000000	phfpd5	QR	2026-02-20 06:49:12.269	16.454823544995850000000000000000	99.530366564838250000000000000000	phfpd5	GPS	APPROVED	7.150000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-19 23:06:40.404	2026-02-19 22:39:50.817	2026-02-20 06:49:14.397	\N	\N	0.000000000000000000000000000000	\N
cmlstbq040001dd3ygvk415z3	cml5g289u003uua47ulssk26x	2026-02-18 17:00:00	2026-02-19 01:59:06.716	16.475171900000000000000000000000	99.553648800000000000000000000000	gujmwl	GPS	2026-02-20 00:56:17.959	16.475186100000000000000000000000	99.553755400000000000000000000000	-rrm7pw	GPS	APPROVED	21.950000000000000000000000000000	13.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 01:59:07.876	2026-02-20 00:56:18.608	89	2026-02-19 07:14:38.101	0.000000000000000000000000000000	2026-02-19 05:44:40.992
cmlu1fjk0000311pezw8egs0n	cml6ctvhm0011uqrgd2s6gv12	2026-02-19 17:00:00	2026-02-19 22:33:48.603	16.455097200000000000000000000000	99.530089399999990000000000000000	4uyosu	QR	2026-02-20 10:33:00.331	16.455041100000000000000000000000	99.530177200000000000000000000000	4uyosu	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-20 10:35:18.602	2026-02-19 22:33:49.248	2026-02-20 10:35:18.603	100	2026-02-20 04:41:26.052	43.375000000000000000000000000000	2026-02-20 03:01:12.752
cmlu2l8cp0007h06vhw9oe4qb	cml6ctvff000xuqrgvuiy6k2z	2026-02-19 17:00:00	2026-02-19 23:00:00	\N	\N	\N	MANUAL	2026-02-20 11:04:00	\N	\N	\N	MANUAL	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-19 23:06:14.281	2026-02-20 11:04:12.044	88	2026-02-20 06:00:00	0.000000000000000000000000000000	2026-02-20 04:32:00
cmlu2atm40003h06vlyiqob2u	cml6ctvnx001buqrgfzjexn6r	2026-02-19 17:00:00	2026-02-19 22:58:07.941	16.455111700000000000000000000000	99.530108299999990000000000000000	-3nueuy	QR	2026-02-20 12:06:08.178	16.455097600000000000000000000000	99.529735100000000000000000000000	-3nueuy	GPS	APPROVED	12.130000000000000000000000000000	4.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-19 23:06:25.818	2026-02-19 22:58:08.621	2026-02-20 12:06:09.007	\N	\N	0.000000000000000000000000000000	\N
cmlvryape0009ggqexz91a59o	cml6ctvgi000zuqrguiuyi2de	2026-01-31 17:00:00	2026-01-31 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:44:00.435	2026-02-21 04:17:52.611	\N	\N	0.000000000000000000000000000000	\N
cmlvs2mpb000fggqexip10zuz	cml6ctvgi000zuqrguiuyi2de	2026-02-02 17:00:00	2026-02-03 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:47:22.607	2026-02-21 04:17:53.519	\N	\N	0.000000000000000000000000000000	\N
cmlvs2z1e000bur21ru3s2dj0	cml6ctvgi000zuqrguiuyi2de	2026-02-03 17:00:00	2026-02-04 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:47:38.594	2026-02-21 04:17:53.972	\N	\N	0.000000000000000000000000000000	\N
cmlslgyht0001tuchpjsfg8sx	cml5g1qzg000iua472zcpgugd	2026-02-18 17:00:00	2026-02-18 22:19:14.058	16.475179100000000000000000000000	99.553634000000000000000000000000	ntdgyb	QR	2026-02-19 10:31:42.789	16.475182700000000000000000000000	99.553659499999990000000000000000	ntdgyb	GPS	APPROVED	11.200000000000000000000000000000	3.200000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 22:19:15.233	2026-02-19 10:31:43.684	87	2026-02-19 05:59:07.739	0.000000000000000000000000000000	2026-02-19 04:31:53.255
cmlvtj8gw000hez6lg1mry1eg	cml6ctvff000xuqrgvuiy6k2z	2026-02-03 17:00:00	2026-02-03 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 09:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.000000000000000000000000000000	2.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:16.928	2026-02-21 04:28:16.928	\N	\N	0.000000000000000000000000000000	\N
cmlvtj8sv000jez6lfy74ehgd	cml6ctvff000xuqrgvuiy6k2z	2026-02-04 17:00:00	2026-02-04 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:28:17.359	2026-02-21 04:28:17.359	\N	\N	0.000000000000000000000000000000	\N
cmlspbg5y0009j798dm95ipy5	cml6ctvms0019uqrg4ft54y7j	2026-02-18 17:00:00	2026-02-19 00:06:55.971	16.455120900000000000000000000000	99.530150600000000000000000000000	-5m8uqd	QR	2026-02-19 12:00:25.07	16.455427700000000000000000000000	99.530225100000000000000000000000	-tqfgt7	GPS	APPROVED	10.880000000000000000000000000000	2.880000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-19 00:06:56.662	2026-02-19 12:00:25.923	47	2026-02-19 05:54:29.251	0.000000000000000000000000000000	2026-02-19 05:07:28.366
cmlvtzgeh0005s33yzocufm0t	cml6ctvja0013uqrgbdjr4l0e	2026-01-27 17:00:00	2026-01-27 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:53.705	2026-02-21 04:40:53.705	\N	\N	0.000000000000000000000000000000	\N
cmlvtzgqa0007s33yj29swuqe	cml6ctvja0013uqrgbdjr4l0e	2026-01-28 17:00:00	2026-01-28 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:54.13	2026-02-21 04:40:54.13	\N	\N	0.000000000000000000000000000000	\N
cmlstcgfl0003dd3y1ekoo3fq	cml6ctvja0013uqrgbdjr4l0e	2026-02-18 17:00:00	2026-02-19 01:59:41.43	16.455062300000000000000000000000	99.530148299999990000000000000000	-xk7lgp	QR	2026-02-19 13:55:59.716	16.455076700000000000000000000000	99.530137600000000000000000000000	-cvmrg6	GPS	APPROVED	10.930000000000000000000000000000	2.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-19 05:57:12.937	2026-02-19 01:59:42.129	2026-02-19 13:56:00.357	87	2026-02-19 09:00:03.209	0.000000000000000000000000000000	2026-02-19 07:32:23.049
cmlt1lww0000586e48j61rugk	cml6ctvlp0017uqrgl43h68pm	2026-02-18 17:00:00	2026-02-19 05:50:59.833	16.455094400000000000000000000000	99.530092400000000000000000000000	-jkouny	QR	2026-02-19 14:02:17.768	16.455106000000000000000000000000	99.530121700000000000000000000000	-hp1zn2	GPS	APPROVED	7.180000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-19 05:57:01.954	2026-02-19 05:51:00.289	2026-02-19 14:02:18.486	\N	\N	0.000000000000000000000000000000	\N
cmlt1unuy000986e4kj2j913v	cml6ctvff000xuqrgvuiy6k2z	2026-02-18 17:00:00	2026-02-18 23:00:00	\N	\N	\N	MANUAL	2026-02-19 11:00:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-19 05:57:48.49	2026-02-19 14:13:23.53	\N	\N	0.000000000000000000000000000000	\N
cmlt1sez6000786e4kwshszn9	cml6ctvcw000tuqrgj8clzpzz	2026-02-18 17:00:00	2026-02-19 05:56:03.208	16.455214748921890000000000000000	99.530108160971180000000000000000	-oj16l7	QR	2026-02-19 14:13:46.44	16.455127503736970000000000000000	99.530139584186980000000000000000	-8fqk0r	GPS	APPROVED	7.280000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-19 05:56:54.217	2026-02-19 05:56:03.666	2026-02-19 14:13:47.095	\N	\N	0.000000000000000000000000000000	\N
cmlvtzh1y0009s33yaa3hxaip	cml6ctvja0013uqrgbdjr4l0e	2026-01-30 17:00:00	2026-01-30 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:54.55	2026-02-21 04:40:54.55	\N	\N	0.000000000000000000000000000000	\N
cmlvtzhdm000bs33y2ixbggap	cml6ctvja0013uqrgbdjr4l0e	2026-01-31 17:00:00	2026-01-31 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:54.971	2026-02-21 04:40:54.971	\N	\N	0.000000000000000000000000000000	\N
cmlvtzhpd000ds33ynmld6biz	cml6ctvja0013uqrgbdjr4l0e	2026-02-01 17:00:00	2026-02-02 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:55.393	2026-02-21 04:40:55.393	\N	\N	0.000000000000000000000000000000	\N
cmlvtzi11000fs33yc2dhi6gs	cml6ctvja0013uqrgbdjr4l0e	2026-02-02 17:00:00	2026-02-03 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:40:55.813	2026-02-21 04:40:55.813	\N	\N	0.000000000000000000000000000000	\N
cmlsndbpi0001rtbnt88rw8ek	cml6ctv270009uqrg7spxr9d4	2026-02-18 17:00:00	2026-02-18 23:12:24.017	16.436263500000000000000000000000	99.511852700000010000000000000000	vr2ul	QR	2026-02-19 11:12:24.017	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:12:24.966	2026-02-19 23:18:22.397	0	2026-02-19 05:02:11.443	0.000000000000000000000000000000	2026-02-19 05:01:56.847
cmlsqcnoj0003jncrs7a0uagl	cml6ctuyp0003uqrgejbtvcmm	2026-02-18 17:00:00	2026-02-19 00:35:52.04	16.436391000000000000000000000000	99.511841100000000000000000000000	ysf08w	QR	2026-02-19 12:37:27.599	16.436519000000000000000000000000	99.511759400000000000000000000000	ysf08w	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 00:35:52.675	2026-02-20 00:51:17.464	\N	\N	0.000000000000000000000000000000	\N
cmlsqdubb0001towzkg2lpmcp	cml6ctva5000nuqrg8wh05sro	2026-02-18 17:00:00	2026-02-19 00:36:47.281	16.436259700000000000000000000000	99.512144500000010000000000000000	10dh5d	QR	2026-02-19 12:37:33.803	16.436279700000000000000000000000	99.511957499999990000000000000000	10dh5d	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 00:36:47.927	2026-02-20 00:51:17.464	\N	\N	0.000000000000000000000000000000	\N
cmlst74t40001wv79hbnhnha1	cml6ctvgi000zuqrguiuyi2de	2026-02-18 17:00:00	2026-02-19 01:55:33.121	16.455055000000000000000000000000	99.530096599999990000000000000000	-5m8uqd	QR	2026-02-19 13:55:36.395	16.455055300000000000000000000000	99.530046500000000000000000000000	hl88nd	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 01:55:33.784	2026-02-20 00:51:17.464	88	2026-02-19 07:29:43.643	0.000000000000000000000000000000	2026-02-19 06:01:07.689
cmlu4l5t6000nh06vxgquvjyo	cml6ctvms0019uqrg4ft54y7j	2026-02-19 17:00:00	2026-02-20 00:02:09.585	16.455103900000000000000000000000	99.530161500000010000000000000000	-5m8uqd	QR	2026-02-20 06:00:28.799	16.455037900000000000000000000000	99.529936699999990000000000000000	-tqfgt7	GPS	APPROVED	4.970000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:02:10.218	2026-02-20 06:00:29.634	\N	\N	0.000000000000000000000000000000	\N
cmlu2frd20001zqv7bnypm3bo	cml5w8h240001ugxaadqh8irg	2026-02-19 17:00:00	2026-02-19 23:01:58.308	16.475276600000000000000000000000	99.553688700000000000000000000000	vpjg0o	QR	2026-02-20 23:00:05.43	16.475405500000000000000000000000	99.553768600000000000000000000000	vpjg0o	GPS	APPROVED	22.970000000000000000000000000000	14.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 23:01:58.982	2026-02-20 23:00:05.88	\N	\N	0.000000000000000000000000000000	\N
cmlu42ngu000jh06vlf67j5l6	cml6cv8sm000313l7yhueq5zy	2026-02-19 17:00:00	2026-02-19 23:47:45.965	16.455040200000000000000000000000	99.530174600000000000000000000000	-oka4kb	QR	2026-02-20 10:01:19.208	16.454936900000000000000000000000	99.530055000000000000000000000000	jl0pv7	GPS	APPROVED	9.220000000000001000000000000000	1.220000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 23:47:46.638	2026-02-20 10:01:19.876	\N	\N	0.000000000000000000000000000000	\N
cmlu2rk8h000139rcvqd1yqal	cml6ctv7w000juqrgh1tdiejn	2026-02-19 17:00:00	2026-02-19 23:11:08.968	16.436298000000000000000000000000	99.512032899999990000000000000000	rcqple	QR	2026-02-20 23:10:43.854	16.436163500000000000000000000000	99.512069999999990000000000000000	rcqple	GPS	APPROVED	22.980000000000000000000000000000	14.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 23:11:09.617	2026-02-20 23:10:44.733	\N	\N	0.000000000000000000000000000000	\N
cmlu22l290001h06vufmevt6u	cml5g1xzx001oua47iy5u23oh	2026-02-19 17:00:00	2026-02-19 22:51:42.427	16.475240500000000000000000000000	99.553782700000000000000000000000	c4n38v	QR	2026-02-20 11:00:13.23	16.475105900000000000000000000000	99.553655500000000000000000000000	c4n38v	GPS	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 22:51:44.289	2026-02-20 11:00:14.487	82	2026-02-20 04:29:53.37	0.000000000000000000000000000000	2026-02-20 03:07:16.794
cmlu34x7b000dh06vezzy2pcp	cml6cv8uy000713l7zocqn0fn	2026-02-19 17:00:00	2026-02-19 23:21:32.315	16.475184600000000000000000000000	99.553630700000000000000000000000	-trvj2p	QR	2026-02-20 11:21:32.315	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 23:21:32.951	2026-02-20 23:35:51.504	\N	\N	0.000000000000000000000000000000	\N
cmlu4ly49000rh06v6mu94ksw	cml6cv8qd000113l7pz55vip3	2026-02-19 17:00:00	2026-02-20 00:02:46.274	16.455186500000000000000000000000	99.530095300000000000000000000000	-xgf12i	QR	2026-02-20 12:02:46.274	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:02:46.905	2026-02-21 00:09:04.185	\N	\N	0.000000000000000000000000000000	\N
cmlu4823z000539rcvh8v49ry	cml5waf57000114p7u4pb0j1l	2026-02-19 17:00:00	2026-02-19 23:51:57.802	16.475185900000000000000000000000	99.553593600000000000000000000000	vr2ul	GPS	2026-02-20 09:56:56.982	16.475507200000000000000000000000	99.553814800000000000000000000000	vr2ul	GPS	APPROVED	9.070000000000000000000000000000	1.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 23:51:58.895	2026-02-20 09:56:57.828	\N	\N	0.000000000000000000000000000000	\N
cmlu4l9ht000ph06vp9n9bqcg	cml6ctvtp001puqrgr6j1clm9	2026-02-19 17:00:00	2026-02-20 00:02:14.361	16.475184000000000000000000000000	99.553718500000000000000000000000	4zl33m	QR	2026-02-20 09:57:21.451	16.475036000000000000000000000000	99.552960100000010000000000000000	4zl33m	GPS	APPROVED	8.920000000000000000000000000000	0.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:02:14.993	2026-02-20 09:57:21.875	\N	\N	0.000000000000000000000000000000	\N
cmlu4ir45000lh06vdewrw0ne	cml6ctvsk001nuqrgooayfxde	2026-02-19 17:00:00	2026-02-20 00:00:16.727	16.475166400000000000000000000000	99.553619700000000000000000000000	-xk7lgp	GPS	2026-02-20 09:58:10.77	16.475286600000000000000000000000	99.553677400000000000000000000000	-xk7lgp	GPS	APPROVED	8.949999999999999000000000000000	0.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:00:17.861	2026-02-20 09:58:12.108	\N	\N	0.000000000000000000000000000000	\N
cmlu4089r000hh06vn9x3yae9	cml6ctuwf0001uqrgn7ktp9je	2026-02-19 17:00:00	2026-02-19 23:45:52.997	16.436300800000000000000000000000	99.511956799999990000000000000000	vr2ul	QR	2026-02-20 10:03:28.747	16.436350500000000000000000000000	99.511851100000000000000000000000	vr2ul	GPS	APPROVED	9.279999999999999000000000000000	1.280000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 23:45:53.632	2026-02-20 10:03:29.377	\N	\N	0.000000000000000000000000000000	\N
cmlu3xkv4000fh06vya5qornr	cml6cv8ts000513l7uydg8j16	2026-02-19 17:00:00	2026-02-19 23:43:49.313	16.475203500000000000000000000000	99.553830199999990000000000000000	-t0727m	QR	2026-02-20 10:12:16.23	16.475183700000000000000000000000	99.553645100000000000000000000000	-t0727m	GPS	APPROVED	9.470000000000001000000000000000	1.470000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 23:43:49.984	2026-02-20 10:12:16.902	\N	\N	0.000000000000000000000000000000	\N
cmlu0z0au000111pe6j30srcp	cml5g1qzg000iua472zcpgugd	2026-02-19 17:00:00	2026-02-19 22:20:56.694	16.475167600000000000000000000000	99.553680400000000000000000000000	ntdgyb	QR	2026-02-20 10:31:10.305	16.475102700000000000000000000000	99.553595100000000000000000000000	ntdgyb	GPS	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 22:20:57.798	2026-02-20 10:31:11.545	86	2026-02-20 04:58:03.836	0.000000000000000000000000000000	2026-02-20 03:31:16.361
cmlvrz1vl0001vsi30qoo3m8b	cmlm76c5y0001vdciu64hkooq	2026-02-13 17:00:00	2026-02-14 01:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:44:35.648	2026-02-21 03:44:35.648	\N	\N	0.000000000000000000000000000000	\N
cmlstcqym0005dd3yyux7xs31	cml5g22hz002gua47temxhj1t	2026-02-18 17:00:00	2026-02-19 01:59:53.448	16.475056300000000000000000000000	99.553389700000000000000000000000	8dlb91	QR	2026-02-19 14:27:16.185	16.475012100000000000000000000000	99.552914599999990000000000000000	8dlb91	GPS	APPROVED	11.450000000000000000000000000000	3.450000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 01:59:55.775	2026-02-20 00:51:17.464	90	2026-02-19 07:39:55.041	0.000000000000000000000000000000	2026-02-19 06:09:17.046
cmlt2heqx0001ktg6i9snx00m	cml5cxygj0003v68ql9533bl3	2026-02-18 17:00:00	2026-02-19 06:15:29.343	16.475181700000000000000000000000	99.553740000000000000000000000000	ymf41f	QR	2026-02-19 15:21:33.951	16.475170500000000000000000000000	99.553639700000010000000000000000	ymf41f	GPS	APPROVED	8.100000000000000000000000000000	0.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 06:15:29.769	2026-02-20 00:51:17.464	\N	\N	0.000000000000000000000000000000	\N
cmltd6p1l00036su25ivdwpti	cml6ctv5n000fuqrg94t826wg	2026-02-18 17:00:00	2026-02-19 11:15:05.252	16.436323300000000000000000000000	99.511932300000000000000000000000	jzx37b	QR	2026-02-19 23:14:46.694	16.436264300000000000000000000000	99.512097500000000000000000000000	-ifqw5k	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 11:15:05.673	2026-02-20 00:51:17.464	\N	\N	0.000000000000000000000000000000	\N
cmlu217sk00051q2tzwd7g93n	cml6ctuzt0005uqrgdnihhrcg	2026-02-19 17:00:00	2026-02-19 22:50:39.58	16.436312800000000000000000000000	99.512031500000010000000000000000	-xuvpf5	QR	2026-02-20 11:07:22.645	16.436263400000000000000000000000	99.511734000000000000000000000000	-xuvpf5	GPS	APPROVED	11.270000000000000000000000000000	3.270000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 22:50:40.436	2026-02-20 11:07:23.283	51	2026-02-20 05:02:41.764	0.000000000000000000000000000000	2026-02-20 04:11:08.884
cmlu30uv0000bh06vfp5m738b	cml6ctv270009uqrg7spxr9d4	2026-02-19 17:00:00	2026-02-19 23:18:21.065	16.436357900000000000000000000000	99.511925600000000000000000000000	vr2ul	QR	2026-02-20 11:18:37.199	16.436299600000000000000000000000	99.511971000000000000000000000000	vr2ul	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 23:18:23.292	2026-02-20 11:18:37.87	0	2026-02-20 06:02:30.504	0.000000000000000000000000000000	2026-02-20 06:02:18.465
cmlvq9sng0001v692brn5r7u5	cml6ctvwy001xuqrgl2hwd8y1	2026-01-26 17:00:00	2026-01-27 00:30:00	\N	\N	\N	MANUAL	2026-01-27 12:30:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 02:56:57.676	2026-02-21 03:00:10.806	\N	\N	0.000000000000000000000000000000	\N
cmlvqhh8b000br6wemfnhpk8r	cml6ctvwy001xuqrgl2hwd8y1	2026-01-30 17:00:00	2026-01-30 23:00:00	\N	\N	\N	MANUAL	2026-01-31 12:00:00	\N	\N	\N	MANUAL	APPROVED	12.000000000000000000000000000000	4.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:02:56.123	2026-02-21 03:03:48.575	\N	\N	0.000000000000000000000000000000	\N
cmlvqh3at0009r6we5hfmq2c4	cml6ctvwy001xuqrgl2hwd8y1	2026-01-29 17:00:00	2026-01-29 23:00:00	\N	\N	\N	MANUAL	2026-01-30 11:00:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:02:38.069	2026-02-21 03:04:06.744	\N	\N	0.000000000000000000000000000000	\N
cmlvqgjbc000fv692vp8n2snc	cml6ctvwy001xuqrgl2hwd8y1	2026-01-28 17:00:00	2026-01-29 00:30:00	\N	\N	\N	MANUAL	2026-01-29 12:30:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:02:12.169	2026-02-21 03:04:49.25	\N	\N	0.000000000000000000000000000000	\N
cmlvrz2u30009vsi31bfhfsto	cmlm76c5y0001vdciu64hkooq	2026-02-17 17:00:00	2026-02-18 01:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-18 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:44:36.891	2026-02-21 03:44:36.891	\N	\N	0.000000000000000000000000000000	\N
cmlvohpo6000346o2lih0hebw	cml5g289u003uua47ulssk26x	2026-02-20 17:00:00	2026-02-21 02:07:06.756	16.475443000000000000000000000000	99.553568500000000000000000000000	-rrm7pw	QR	2026-02-22 01:57:50.261	16.475114100000000000000000000000	99.553776799999990000000000000000	-rrm7pw	GPS	APPROVED	22.830000000000000000000000000000	14.830000000000000000000000000000	67	\N	100.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 02:07:07.83	2026-02-22 01:57:51.545	94	2026-02-21 07:36:45.545	0.000000000000000000000000000000	2026-02-21 06:02:27.18
cmld3anv500011brh4xuyiaso	cml5g20im0022ua4780xu5bou	2026-02-07 17:00:00	2026-02-08 01:53:55.151	16.475417000000000000000000000000	99.553847000000000000000000000000	-nselrn	QR	2026-02-08 13:53:55.151	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 01:53:55.794	2026-02-20 01:56:59.693	90	2026-02-08 07:01:28.488	0.000000000000000000000000000000	2026-02-08 05:31:06.891
cmlu5iogm000th06vzqffz8e8	cml6ctvwy001xuqrgl2hwd8y1	2026-02-19 17:00:00	2026-02-20 00:28:12.904	16.455160000000000000000000000000	99.530121700000000000000000000000	ymf41f	QR	2026-02-20 12:30:07.91	16.455064600000000000000000000000	99.530122100000000000000000000000	ymf41f	GPS	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	118	\N	100.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:28:14.038	2026-02-20 12:30:08.803	89	2026-02-20 07:29:49.445	0.000000000000000000000000000000	2026-02-20 06:00:05.042
cmlu5t8fe000d39rcc7kchvdn	cml6ctuyp0003uqrgejbtvcmm	2026-02-19 17:00:00	2026-02-20 00:36:25.834	16.436310700000000000000000000000	99.511959300000000000000000000000	ysf08w	QR	2026-02-20 12:36:18.829	16.436295600000000000000000000000	99.511899799999990000000000000000	ysf08w	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:36:26.474	2026-02-20 12:36:19.712	\N	\N	0.000000000000000000000000000000	\N
cmlu5x9kc000f39rcqhr3qez3	cml6ctva5000nuqrg8wh05sro	2026-02-19 17:00:00	2026-02-20 00:39:33.926	16.436296600000000000000000000000	99.511941300000000000000000000000	10dh5d	QR	2026-02-20 12:38:38.725	16.436192400000000000000000000000	99.512144800000000000000000000000	10dh5d	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:39:34.573	2026-02-20 12:38:39.605	\N	\N	0.000000000000000000000000000000	\N
cmlu8rvx5000513eqd0tzqz18	cml6ctvja0013uqrgbdjr4l0e	2026-02-19 17:00:00	2026-02-20 01:59:20.152	16.455082200000000000000000000000	99.530126200000000000000000000000	-xk7lgp	QR	2026-02-20 13:54:15.827	16.455010700000000000000000000000	99.529959800000000000000000000000	-cvmrg6	GPS	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-20 04:33:09.944	2026-02-20 01:59:20.793	2026-02-20 13:54:16.721	91	2026-02-20 09:02:19.262	0.000000000000000000000000000000	2026-02-20 07:30:50.703
cmlu8nbs4000113equgwb3vlh	cml6ctvgi000zuqrguiuyi2de	2026-02-19 17:00:00	2026-02-20 01:55:49.049	16.455091300000000000000000000000	99.530144800000000000000000000000	-5m8uqd	QR	2026-02-20 13:54:23.11	16.455068200000000000000000000000	99.530123700000000000000000000000	hl88nd	GPS	APPROVED	10.970000000000000000000000000000	2.970000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctvcw000tuqrgj8clzpzz	2026-02-20 04:33:18.034	2026-02-20 01:55:49.732	2026-02-20 13:54:23.558	88	2026-02-20 07:28:56.741	0.000000000000000000000000000000	2026-02-20 06:00:50.859
cmlvqfxka000dv692v0nu4b22	cml6ctvwy001xuqrgl2hwd8y1	2026-01-27 17:00:00	2026-01-28 00:30:00	\N	\N	\N	MANUAL	2026-01-28 12:30:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:01:43.979	2026-02-21 03:05:01.211	\N	\N	0.000000000000000000000000000000	\N
cmlu54xi6000739rczjhgk0wm	cml6ctvqa001huqrgn8fa8qe5	2026-02-19 17:00:00	2026-02-20 00:17:31.902	16.455180200000000000000000000000	99.530046400000000000000000000000	c4n38v	QR	2026-02-20 10:02:16.204	16.454874400000000000000000000000	99.530316700000000000000000000000	c4n38v	GPS	APPROVED	8.730000000000000000000000000000	0.730000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:17:32.574	2026-02-20 10:02:17.091	\N	\N	0.000000000000000000000000000000	\N
cmlu5s40t000b39rc6yhwheu9	cml6ctvrh001luqrg60imh1k9	2026-02-19 17:00:00	2026-02-20 00:35:33.027	16.475506000000000000000000000000	99.553810000000000000000000000000	-xuvpf5	GPS	2026-02-20 10:02:42.401	16.475948400000000000000000000000	99.553214400000000000000000000000	-xuvpf5	GPS	APPROVED	8.449999999999999000000000000000	0.450000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:35:34.109	2026-02-20 10:02:43.506	\N	\N	0.000000000000000000000000000000	\N
cmlu57o1j000939rcy1fwclxe	cml6ctv0x0007uqrgprf5lu7c	2026-02-19 17:00:00	2026-02-20 00:19:39.644	16.436247623379400000000000000000	99.511791436240860000000000000000	-85vz5c	QR	2026-02-20 12:11:37.705	16.436395892181130000000000000000	99.511789424514320000000000000000	-85vz5c	GPS	APPROVED	10.850000000000000000000000000000	2.850000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-20 00:19:40.279	2026-02-20 12:11:38.336	71	2026-02-20 07:14:16.241	28.916666666666670000000000000000	2026-02-20 06:03:07.187
cmlu6jbu8000143c8pdrqtw2g	cml5g289u003uua47ulssk26x	2026-02-19 17:00:00	2026-02-20 00:56:42.836	16.475214600000000000000000000000	99.553782700000000000000000000000	-rrm7pw	QR	2026-02-20 13:01:31.589	16.475084500000000000000000000000	99.553733600000000000000000000000	-rrm7pw	GPS	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 00:56:43.952	2026-02-21 00:51:17.252	89	2026-02-20 05:59:43.298	0.000000000000000000000000000000	2026-02-20 04:30:01.866
cmlu8oumw000313eqkzdysh24	cml5g20im0022ua4780xu5bou	2026-02-19 17:00:00	2026-02-20 01:56:59.035	16.475184700000000000000000000000	99.553626300000000000000000000000	-rrm7pw	GPS	2026-02-20 14:15:59.166	16.475209100000000000000000000000	99.553627000000010000000000000000	-rrm7pw	GPS	APPROVED	11.320000000000000000000000000000	3.320000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 01:57:00.824	2026-02-21 00:51:17.252	85	2026-02-20 06:26:36.303	0.000000000000000000000000000000	2026-02-20 05:00:40.794
cmlu8sc43000713eqpncxcfa3	cml5g1vmh001aua47rlxc2pr1	2026-02-19 17:00:00	2026-02-20 01:59:41.737	16.475208900000000000000000000000	99.553686300000000000000000000000	2hlpr1	QR	2026-02-20 13:57:11.513	16.475197400000000000000000000000	99.553657200000000000000000000000	2hlpr1	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 01:59:43.444	2026-02-21 00:51:17.252	89	2026-02-20 07:29:37.815	0.000000000000000000000000000000	2026-02-20 05:59:52.427
cmlvqebx70009v69295hft636	cml6ctv3c000buqrguslcci85	2026-01-28 17:00:00	2026-01-28 23:09:00	\N	\N	\N	MANUAL	2026-01-29 11:12:00	\N	\N	\N	MANUAL	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:00:29.275	2026-02-21 03:12:54.363	\N	\N	0.000000000000000000000000000000	\N
cmlvqd7vq0001r6wekh4vhtnr	cml6ctv3c000buqrguslcci85	2026-01-25 17:00:00	2026-01-25 23:00:00	\N	\N	\N	MANUAL	2026-01-26 11:10:00	\N	\N	\N	MANUAL	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 02:59:37.382	2026-02-21 03:10:44.77	\N	\N	0.000000000000000000000000000000	\N
cmlvqmugu000dr6we0hqdmmej	cml6ctvwy001xuqrgl2hwd8y1	2026-01-31 17:00:00	2026-01-31 22:30:00	\N	\N	\N	MANUAL	2026-02-01 10:30:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:07:06.558	2026-02-21 03:10:55.321	\N	\N	0.000000000000000000000000000000	\N
cmlvqf0s20003r6wefnllxihq	cml6ctv3c000buqrguslcci85	2026-01-29 17:00:00	2026-01-29 23:00:00	\N	\N	\N	MANUAL	2026-01-30 11:11:00	\N	\N	\N	MANUAL	APPROVED	11.180000000000000000000000000000	3.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:01:01.49	2026-02-21 03:13:11.406	\N	\N	0.000000000000000000000000000000	\N
cmlvqo28x000hv6929lap3fau	cml6ctvwy001xuqrgl2hwd8y1	2026-02-01 17:00:00	2026-02-01 22:30:00	\N	\N	\N	MANUAL	2026-02-02 10:30:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:08:03.297	2026-02-21 03:11:12.513	\N	\N	0.000000000000000000000000000000	\N
cmlvqfvh3000bv692blw270sq	cml6ctv3c000buqrguslcci85	2026-02-03 17:00:00	2026-02-03 23:00:00	\N	\N	\N	MANUAL	2026-02-04 11:04:00	\N	\N	\N	MANUAL	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:01:41.271	2026-02-21 03:16:04.575	\N	\N	0.000000000000000000000000000000	\N
cmlvqpryo000fr6weudravstf	cml6ctvwy001xuqrgl2hwd8y1	2026-02-03 17:00:00	2026-02-03 22:30:00	\N	\N	\N	ADMIN_EDIT	2026-02-04 10:30:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	\N	\N	0.000000000000000000000000000000	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:14:40.861	2026-02-21 03:09:23.281	2026-02-21 03:14:40.862	\N	\N	0.000000000000000000000000000000	\N
cmlvqdp6a0005v692eflr1jxb	cml6ctv3c000buqrguslcci85	2026-01-26 17:00:00	2026-01-26 23:00:00	\N	\N	\N	MANUAL	2026-01-27 11:10:00	\N	\N	\N	MANUAL	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 02:59:59.795	2026-02-21 03:12:24.896	\N	\N	0.000000000000000000000000000000	\N
cmlvqdwzj0007v692lkwh4nqf	cml6ctv3c000buqrguslcci85	2026-01-27 17:00:00	2026-01-27 23:00:00	\N	\N	\N	MANUAL	2026-01-28 11:05:00	\N	\N	\N	MANUAL	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:00:09.919	2026-02-21 03:12:37.028	\N	\N	0.000000000000000000000000000000	\N
cmlvqf8xm0005r6welu2z0bmr	cml6ctv3c000buqrguslcci85	2026-01-30 17:00:00	2026-01-30 23:00:00	\N	\N	\N	MANUAL	2026-01-31 11:06:00	\N	\N	\N	MANUAL	APPROVED	11.100000000000000000000000000000	3.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:01:12.058	2026-02-21 03:15:33.845	\N	\N	0.000000000000000000000000000000	\N
cmlvqfjeg0007r6wejmxc2apa	cml6ctv3c000buqrguslcci85	2026-01-31 17:00:00	2026-01-31 23:00:00	\N	\N	\N	MANUAL	2026-02-01 11:10:00	\N	\N	\N	MANUAL	APPROVED	11.170000000000000000000000000000	3.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:01:25.624	2026-02-21 03:15:48.59	\N	\N	0.000000000000000000000000000000	\N
cmlvrz33d000fvsi33io6il96	cmlm76c5y0001vdciu64hkooq	2026-02-20 17:00:00	2026-02-21 01:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-21 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:44:37.225	2026-02-21 03:44:37.225	\N	\N	0.000000000000000000000000000000	\N
cmlvtsoj700019q91l11gg6lf	cml6ctuzt0005uqrgdnihhrcg	2026-01-25 17:00:00	2026-01-25 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.500000000000000000000000000000	3.500000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:37.651	2026-02-21 04:35:37.651	\N	\N	0.000000000000000000000000000000	\N
cmlvs1w700009ur21s6fmyyqv	cml6ctvgi000zuqrguiuyi2de	2026-02-01 17:00:00	2026-02-02 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 14:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.500000000000000000000000000000	3.500000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:46:48.252	2026-02-21 04:17:53.065	\N	\N	0.000000000000000000000000000000	\N
cmlvtsp0s00039q91mu75b91b	cml6ctuzt0005uqrgdnihhrcg	2026-01-26 17:00:00	2026-01-26 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 11:02:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:38.284	2026-02-21 04:35:38.284	\N	\N	0.000000000000000000000000000000	\N
cmlvtspck00059q91rug3mqai	cml6ctuzt0005uqrgdnihhrcg	2026-01-28 17:00:00	2026-01-28 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 11:04:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:38.708	2026-02-21 04:35:38.708	\N	\N	0.000000000000000000000000000000	\N
cmlvtspd700079q91xvlae6c0	cml6ctvhm0011uqrgd2s6gv12	2026-01-25 17:00:00	2026-01-26 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:35:38.732	2026-02-21 04:35:38.732	\N	\N	0.000000000000000000000000000000	\N
cmlvrz30u000dvsi3nuegf7ql	cmlm76c5y0001vdciu64hkooq	2026-02-19 17:00:00	2026-02-20 11:07:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-19 23:20:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:44:37.134	2026-02-21 05:27:43.989	\N	\N	0.000000000000000000000000000000	\N
cmlvu4b7l000b1coc40blubbp	cml6cv8sm000313l7yhueq5zy	2026-02-04 17:00:00	2026-02-05 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:40.258	2026-02-21 04:44:40.258	\N	\N	0.000000000000000000000000000000	\N
cmlvu4bjg000d1cocgq5bzar9	cml6cv8sm000313l7yhueq5zy	2026-02-13 17:00:00	2026-02-14 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:40.684	2026-02-21 04:44:40.684	\N	\N	0.000000000000000000000000000000	\N
cmlvu4ddm000h1cocz52w4l30	cml6ctv270009uqrg7spxr9d4	2026-01-25 17:00:00	2026-01-25 23:10:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 11:09:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:43.066	2026-02-21 04:44:43.066	\N	\N	0.000000000000000000000000000000	\N
cmlvu4dpg000j1coccuikis65	cml6ctv270009uqrg7spxr9d4	2026-01-26 17:00:00	2026-01-26 23:14:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 11:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:43.492	2026-02-21 04:44:43.492	\N	\N	0.000000000000000000000000000000	\N
cmlvu4e1a000l1cock24ifc4o	cml6ctv270009uqrg7spxr9d4	2026-01-27 17:00:00	2026-01-27 23:12:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 11:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:43.918	2026-02-21 04:44:43.918	\N	\N	0.000000000000000000000000000000	\N
cmlvu4ej0000n1coct182i2m3	cml6ctv270009uqrg7spxr9d4	2026-01-28 17:00:00	2026-01-28 23:12:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 11:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:44:44.556	2026-02-21 04:44:44.556	\N	\N	0.000000000000000000000000000000	\N
cmlvuaksj000r1cocffj9a03v	cml6ctv7w000juqrgh1tdiejn	2026-01-31 17:00:00	2026-01-31 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 06:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	6.500000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:49:32.611	2026-02-21 04:49:32.611	\N	\N	0.000000000000000000000000000000	\N
cmlvuala8000t1cockwv3lfng	cml6ctv7w000juqrgh1tdiejn	2026-02-01 17:00:00	2026-02-01 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 15:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	15.500000000000000000000000000000	7.500000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:49:33.248	2026-02-21 04:49:33.248	\N	\N	0.000000000000000000000000000000	\N
cmlvualm1000v1cocx5zsrh2m	cml6ctv7w000juqrgh1tdiejn	2026-02-02 17:00:00	2026-02-02 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 06:25:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	6.420000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:49:33.673	2026-02-21 04:49:33.673	\N	\N	0.000000000000000000000000000000	\N
cmlvualxu000x1coc7ovxa05q	cml6ctv7w000juqrgh1tdiejn	2026-02-03 17:00:00	2026-02-03 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 06:20:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	6.330000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:49:34.098	2026-02-21 04:49:34.098	\N	\N	0.000000000000000000000000000000	\N
cmlcxrrml0001ps4qrmdpk11s	cml6ctv7w000juqrgh1tdiejn	2026-02-07 17:00:00	2026-02-07 23:19:00	16.436231500000000000000000000000	99.512064000000000000000000000000	rcqple	ADMIN_BACKFILL	2026-02-08 06:27:00	16.436200500000000000000000000000	99.511998100000000000000000000000	rcqple	ADMIN_BACKFILL	APPROVED	6.130000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	cml6ctv7w000juqrgh1tdiejn	2026-02-09 05:59:24.005	2026-02-07 23:19:16.125	2026-02-21 04:49:34.523	\N	\N	0.000000000000000000000000000000	\N
cmlvuanez00151cocmm9zza1c	cml6ctv7w000juqrgh1tdiejn	2026-02-14 17:00:00	2026-02-14 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-15 06:47:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	6.780000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:49:36.011	2026-02-21 04:49:36.011	\N	\N	0.000000000000000000000000000000	\N
cmlr7uzq0000d43ngt77vshh1	cml6ctv7w000juqrgh1tdiejn	2026-02-17 17:00:00	2026-02-17 23:10:00	16.436249600000000000000000000000	99.512130400000000000000000000000	rcqple	ADMIN_BACKFILL	2026-02-18 06:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	6.330000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:10:29.208	2026-02-21 04:50:09.96	\N	\N	0.000000000000000000000000000000	\N
cmlvuhi3i001f9q91d6k0tcae	cml6ctv0x0007uqrgprf5lu7c	2026-01-25 17:00:00	2026-01-26 00:16:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 12:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:54:55.71	2026-02-21 04:54:55.71	\N	\N	0.000000000000000000000000000000	\N
cmlvuhil4001h9q91gioee4bx	cml6ctv0x0007uqrgprf5lu7c	2026-01-26 17:00:00	2026-01-27 00:08:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 12:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:54:56.344	2026-02-21 04:54:56.344	\N	\N	0.000000000000000000000000000000	\N
cmlvuhiwv001j9q911fzv3bs6	cml6ctv0x0007uqrgprf5lu7c	2026-01-27 17:00:00	2026-01-28 00:20:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 12:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:54:56.767	2026-02-21 04:54:56.767	\N	\N	0.000000000000000000000000000000	\N
cmlvuhj8l001l9q91fwe42spk	cml6ctv0x0007uqrgprf5lu7c	2026-01-28 17:00:00	2026-01-29 00:18:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 12:21:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:54:57.19	2026-02-21 04:54:57.19	\N	\N	0.000000000000000000000000000000	\N
cmlvuhjkc001n9q91b32udvkq	cml6ctv0x0007uqrgprf5lu7c	2026-01-31 17:00:00	2026-02-01 00:25:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 12:19:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:54:57.612	2026-02-21 04:54:57.612	\N	\N	0.000000000000000000000000000000	\N
cmlvuhjw3001p9q91g3kmfxnw	cml6ctv0x0007uqrgprf5lu7c	2026-02-01 17:00:00	2026-02-01 23:55:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 12:03:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:54:58.035	2026-02-21 04:54:58.035	\N	\N	0.000000000000000000000000000000	\N
cmlvuhk7x001r9q913rtjlgq5	cml6ctv0x0007uqrgprf5lu7c	2026-02-02 17:00:00	2026-02-03 00:12:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 12:12:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:54:58.461	2026-02-21 04:54:58.461	\N	\N	0.000000000000000000000000000000	\N
cmlvuhkjo001t9q91it5xcfmy	cml6ctv0x0007uqrgprf5lu7c	2026-02-03 17:00:00	2026-02-04 00:12:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 12:13:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:54:58.884	2026-02-21 04:54:58.884	\N	\N	0.000000000000000000000000000000	\N
cmlvun76p000ns33y2bdivkhd	cml6ctuyp0003uqrgejbtvcmm	2026-01-25 17:00:00	2026-01-26 00:38:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 12:12:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.570000000000000000000000000000	2.570000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:21.505	2026-02-21 04:59:21.505	\N	\N	0.000000000000000000000000000000	\N
cmlvun7on000ps33ym9ov2908	cml6ctuyp0003uqrgejbtvcmm	2026-01-26 17:00:00	2026-01-27 00:42:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 12:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.480000000000000000000000000000	2.480000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:22.151	2026-02-21 04:59:22.151	\N	\N	0.000000000000000000000000000000	\N
cmlvun80m000rs33yik1cbwxy	cml6ctuyp0003uqrgejbtvcmm	2026-01-28 17:00:00	2026-01-29 00:39:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 12:13:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.570000000000000000000000000000	2.570000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:22.582	2026-02-21 04:59:22.582	\N	\N	0.000000000000000000000000000000	\N
cmlvun8cl000ts33y1yj0n84m	cml6ctuyp0003uqrgejbtvcmm	2026-01-29 17:00:00	2026-01-30 00:36:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 12:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.570000000000000000000000000000	2.570000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:23.013	2026-02-21 04:59:23.013	\N	\N	0.000000000000000000000000000000	\N
cmlvun8ok000vs33yfkp1r4si	cml6ctuyp0003uqrgejbtvcmm	2026-01-30 17:00:00	2026-01-31 00:40:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 12:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.500000000000000000000000000000	2.500000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:23.444	2026-02-21 04:59:23.444	\N	\N	0.000000000000000000000000000000	\N
cmlvun90j000xs33y0q1iedha	cml6ctuyp0003uqrgejbtvcmm	2026-01-31 17:00:00	2026-02-01 00:43:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 12:13:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.500000000000000000000000000000	2.500000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:23.875	2026-02-21 04:59:23.875	\N	\N	0.000000000000000000000000000000	\N
cmlvun9ci000zs33yxrf7iw8h	cml6ctuyp0003uqrgejbtvcmm	2026-02-01 17:00:00	2026-02-02 00:42:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 12:20:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.630000000000000000000000000000	2.630000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:24.306	2026-02-21 04:59:24.306	\N	\N	0.000000000000000000000000000000	\N
cmlvun9og0011s33yp82i8wc2	cml6ctuyp0003uqrgejbtvcmm	2026-02-02 17:00:00	2026-02-03 00:36:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 12:38:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:24.736	2026-02-21 04:59:24.736	\N	\N	0.000000000000000000000000000000	\N
cmlvuna0f0013s33yhz449zvk	cml6ctuyp0003uqrgejbtvcmm	2026-02-03 17:00:00	2026-02-04 00:40:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 12:35:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:25.167	2026-02-21 04:59:25.167	\N	\N	0.000000000000000000000000000000	\N
cmlvunacd0015s33yuvker2iy	cml6ctuyp0003uqrgejbtvcmm	2026-02-13 17:00:00	2026-02-14 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 12:31:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 04:59:25.598	2026-02-21 04:59:25.598	\N	\N	0.000000000000000000000000000000	\N
cmlvuupjw00279q9144pxg9mk	cml6ctv5n000fuqrg94t826wg	2026-01-25 17:00:00	2026-01-26 11:10:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-25 23:16:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:11.9	2026-02-21 05:05:11.9	\N	\N	0.000000000000000000000000000000	\N
cmlvuuq2n00299q910jp7z0hb	cml6ctv5n000fuqrg94t826wg	2026-01-26 17:00:00	2026-01-27 11:11:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 23:17:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:12.575	2026-02-21 05:05:12.575	\N	\N	0.000000000000000000000000000000	\N
cmlvuuqf5002b9q91y5staziy	cml6ctv5n000fuqrg94t826wg	2026-01-27 17:00:00	2026-01-28 11:05:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 23:08:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:13.026	2026-02-21 05:05:13.026	\N	\N	0.000000000000000000000000000000	\N
cmlvuuqrn002d9q91zsdnoxd3	cml6ctv5n000fuqrg94t826wg	2026-01-28 17:00:00	2026-01-29 11:11:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 23:13:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:13.476	2026-02-21 05:05:13.476	\N	\N	0.000000000000000000000000000000	\N
cmlvuur45002f9q91ombmujp7	cml6ctv5n000fuqrg94t826wg	2026-01-29 17:00:00	2026-01-30 11:11:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 23:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:13.926	2026-02-21 05:05:13.926	\N	\N	0.000000000000000000000000000000	\N
cmlvuurgo002h9q91yevwniht	cml6ctv5n000fuqrg94t826wg	2026-01-30 17:00:00	2026-01-31 11:09:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 23:12:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:14.376	2026-02-21 05:05:14.376	\N	\N	0.000000000000000000000000000000	\N
cmlvuus5l002j9q91whbzp3qn	cml6ctv5n000fuqrg94t826wg	2026-01-31 17:00:00	2026-02-01 11:16:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 23:17:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	16	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:15.274	2026-02-21 05:05:15.274	\N	\N	0.000000000000000000000000000000	\N
cmlvuusob002l9q91nxanvs1p	cml6ctv5n000fuqrg94t826wg	2026-02-01 17:00:00	2026-02-02 11:10:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 01:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	10	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:15.947	2026-02-21 05:05:15.947	\N	\N	0.000000000000000000000000000000	\N
cmlvuut72002n9q917c1rtp7s	cml6ctv5n000fuqrg94t826wg	2026-02-02 17:00:00	2026-02-03 11:14:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 23:21:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	14	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:16.622	2026-02-21 05:05:16.622	\N	\N	0.000000000000000000000000000000	\N
cmlvuutps002p9q91bb4rfwib	cml6ctv5n000fuqrg94t826wg	2026-02-03 17:00:00	2026-02-04 11:14:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 23:14:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	14	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:17.296	2026-02-21 05:05:17.296	\N	\N	0.000000000000000000000000000000	\N
cmlvuuu8i002r9q91djzqhnc0	cml6ctv5n000fuqrg94t826wg	2026-02-12 17:00:00	2026-02-13 11:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-12 23:07:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:17.97	2026-02-21 05:05:17.97	\N	\N	0.000000000000000000000000000000	\N
cmlvuuur8002t9q91him0my5t	cml6ctv5n000fuqrg94t826wg	2026-02-13 17:00:00	2026-02-14 11:18:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-13 23:16:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	18	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:18.644	2026-02-21 05:05:18.644	\N	\N	0.000000000000000000000000000000	\N
cmlvuuv9z002v9q91slbirr9d	cml6ctv5n000fuqrg94t826wg	2026-02-14 17:00:00	2026-02-15 11:09:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	9	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:05:19.319	2026-02-21 05:05:19.319	\N	\N	0.000000000000000000000000000000	\N
cmlvuyt05002z9q91dienm2f2	cml6ctuwf0001uqrgn7ktp9je	2026-01-31 17:00:00	2026-02-01 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 10:03:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.050000000000001000000000000000	1.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:08:22.998	2026-02-21 05:08:22.998	\N	\N	0.000000000000000000000000000000	\N
cmlvuytpr00319q910bvrtys2	cml6ctuwf0001uqrgn7ktp9je	2026-02-01 17:00:00	2026-02-02 00:07:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 10:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.970000000000001000000000000000	0.970000000000000000000000000000	7	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:08:23.919	2026-02-21 05:08:23.919	\N	\N	0.000000000000000000000000000000	\N
cmlvuyu9000339q91b9vgv7wt	cml6ctuwf0001uqrgn7ktp9je	2026-02-02 17:00:00	2026-02-03 00:07:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.880000000000001000000000000000	0.880000000000000000000000000000	7	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:08:24.612	2026-02-21 05:08:24.612	\N	\N	0.000000000000000000000000000000	\N
cmlvuyusm00359q91oks29eev	cml6ctuwf0001uqrgn7ktp9je	2026-02-03 17:00:00	2026-02-04 00:01:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.980000000000000000000000000000	0.980000000000000000000000000000	1	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:08:25.319	2026-02-21 05:08:25.319	\N	\N	0.000000000000000000000000000000	\N
cmlvuyvbv00379q91uryf05uo	cml6ctuwf0001uqrgn7ktp9je	2026-02-04 17:00:00	2026-02-05 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:08:26.011	2026-02-21 05:08:26.011	\N	\N	0.000000000000000000000000000000	\N
cmlvuyvv300399q91cc3xpv6c	cml6ctuwf0001uqrgn7ktp9je	2026-02-05 17:00:00	2026-02-05 23:55:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-06 10:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.170000000000000000000000000000	1.170000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:08:26.703	2026-02-21 05:08:26.703	\N	\N	0.000000000000000000000000000000	\N
cmlvuywec003b9q910paad8ti	cml6ctuwf0001uqrgn7ktp9je	2026-02-13 17:00:00	2026-02-13 23:55:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 10:01:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.100000000000000000000000000000	1.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:08:27.396	2026-02-21 05:08:27.396	\N	\N	0.000000000000000000000000000000	\N
cmlvvgnso0001sddlmxdio1db	cml6cuiw70001zj29jbewbh4e	2026-01-31 17:00:00	2026-01-31 23:57:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 10:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.130000000000001000000000000000	1.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:16.056	2026-02-21 05:22:16.056	\N	\N	0.000000000000000000000000000000	\N
cmlvvgob40003sddlfff9o2mp	cml6cuiw70001zj29jbewbh4e	2026-02-01 17:00:00	2026-02-02 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.000000000000000000000000000000	1.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:16.72	2026-02-21 05:22:16.72	\N	\N	0.000000000000000000000000000000	\N
cmlvvgone0005sddlmbe9una7	cml6cuiw70001zj29jbewbh4e	2026-02-02 17:00:00	2026-02-03 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 10:18:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.300000000000001000000000000000	1.300000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:17.163	2026-02-21 05:22:17.163	\N	\N	0.000000000000000000000000000000	\N
cmlvvgozp0007sddlje2sw8h9	cml6cuiw70001zj29jbewbh4e	2026-02-03 17:00:00	2026-02-04 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 10:06:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.100000000000000000000000000000	1.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:17.605	2026-02-21 05:22:17.605	\N	\N	0.000000000000000000000000000000	\N
cmlvvgpc00009sddlu8tthzxz	cml6cuiw70001zj29jbewbh4e	2026-02-04 17:00:00	2026-02-04 23:53:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 10:18:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.420000000000000000000000000000	1.420000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:18.048	2026-02-21 05:22:18.048	\N	\N	0.000000000000000000000000000000	\N
cmlvvgpob000bsddldb1d3xg7	cml6cuiw70001zj29jbewbh4e	2026-02-05 17:00:00	2026-02-05 23:55:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-06 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.080000000000000000000000000000	1.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:18.491	2026-02-21 05:22:18.491	\N	\N	0.000000000000000000000000000000	\N
cmlvvgq0m000dsddllpt4ge56	cml6cuiw70001zj29jbewbh4e	2026-02-06 17:00:00	2026-02-06 23:55:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-07 10:02:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.119999999999999000000000000000	1.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:18.934	2026-02-21 05:22:18.934	\N	\N	0.000000000000000000000000000000	\N
cmlvvgqcw000fsddldrw2b5t2	cml6cuiw70001zj29jbewbh4e	2026-02-07 17:00:00	2026-02-07 23:57:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-08 10:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.130000000000001000000000000000	1.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:19.376	2026-02-21 05:22:19.376	\N	\N	0.000000000000000000000000000000	\N
cmlvvgqp6000hsddlufg3yk2j	cml6cuiw70001zj29jbewbh4e	2026-02-08 17:00:00	2026-02-09 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-09 10:04:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.070000000000000000000000000000	1.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:19.818	2026-02-21 05:22:19.818	\N	\N	0.000000000000000000000000000000	\N
cmlvvgr1h000jsddl0zagphox	cml6cuiw70001zj29jbewbh4e	2026-02-09 17:00:00	2026-02-09 23:57:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-10 10:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.130000000000001000000000000000	1.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:20.261	2026-02-21 05:22:20.261	\N	\N	0.000000000000000000000000000000	\N
cmlvvgrq2000nsddlng5z0786	cml6cuiw70001zj29jbewbh4e	2026-02-11 17:00:00	2026-02-11 23:58:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-12 10:20:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.369999999999999000000000000000	1.370000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:21.146	2026-02-21 05:22:21.146	\N	\N	0.000000000000000000000000000000	\N
cmlvvgs2d000psddl4seas6i2	cml6cuiw70001zj29jbewbh4e	2026-02-12 17:00:00	2026-02-12 23:55:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-13 10:04:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.150000000000000000000000000000	1.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:21.589	2026-02-21 05:22:21.589	\N	\N	0.000000000000000000000000000000	\N
cmlvvgsen000rsddlc54cbdmk	cml6cuiw70001zj29jbewbh4e	2026-02-13 17:00:00	2026-02-13 23:54:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 10:03:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.150000000000000000000000000000	1.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:22.031	2026-02-21 05:22:22.031	\N	\N	0.000000000000000000000000000000	\N
cmlvvgsqy000tsddl89kmdc55	cml6cuiw70001zj29jbewbh4e	2026-02-14 17:00:00	2026-02-14 23:57:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-15 10:04:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.119999999999999000000000000000	1.120000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:22.474	2026-02-21 05:22:22.474	\N	\N	0.000000000000000000000000000000	\N
cmlvvgt38000vsddld9mcnqfa	cml6cuiw70001zj29jbewbh4e	2026-02-15 17:00:00	2026-02-15 23:55:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-16 10:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.080000000000000000000000000000	1.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:22.916	2026-02-21 05:22:22.916	\N	\N	0.000000000000000000000000000000	\N
cmlvvgtfj000xsddlwh6chhsg	cml6cuiw70001zj29jbewbh4e	2026-02-16 17:00:00	2026-02-17 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-17 10:21:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.350000000000000000000000000000	1.350000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:23.359	2026-02-21 05:22:23.359	\N	\N	0.000000000000000000000000000000	\N
cmlvvgtry000zsddljtlufvts	cml6cuiw70001zj29jbewbh4e	2026-02-17 17:00:00	2026-02-18 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-18 05:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	4.250000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:23.806	2026-02-21 05:22:23.806	\N	\N	0.000000000000000000000000000000	\N
cmlvvgu490011sddlyttmq43k	cml6cuiw70001zj29jbewbh4e	2026-02-18 17:00:00	2026-02-19 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-19 10:04:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.070000000000000000000000000000	1.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:24.249	2026-02-21 05:22:24.249	\N	\N	0.000000000000000000000000000000	\N
cmlvvgugk0013sddlt3btfqzz	cml6cuiw70001zj29jbewbh4e	2026-02-19 17:00:00	2026-02-19 23:57:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-20 10:22:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.420000000000000000000000000000	1.420000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:24.692	2026-02-21 05:22:24.692	\N	\N	0.000000000000000000000000000000	\N
cmlvvh3q80017sddlvbddq2s0	cml6cuiw70001zj29jbewbh4e	2026-02-20 17:00:00	2026-02-20 23:57:00	\N	\N	\N	ADMIN_BACKFILL	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:36.704	2026-02-21 05:22:36.704	\N	\N	0.000000000000000000000000000000	\N
cmlvvgrds000lsddlbi4ihh8p	cml6cuiw70001zj29jbewbh4e	2026-02-10 17:00:00	2026-02-10 23:59:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-11 10:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	9.100000000000000000000000000000	1.100000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:22:20.704	2026-02-21 05:22:57.342	\N	\N	0.000000000000000000000000000000	\N
cmlvvnlbu0001j6buq5smh1ka	cmlm76c5y0001vdciu64hkooq	2026-02-04 17:00:00	2026-02-04 23:08:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 11:12:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.070000000000000000000000000000	3.070000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:27:39.45	2026-02-21 05:27:39.45	\N	\N	0.000000000000000000000000000000	\N
cmlvvnltu0003j6buf7t4hbs3	cmlm76c5y0001vdciu64hkooq	2026-02-05 17:00:00	2026-02-05 23:26:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-06 11:14:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.800000000000000000000000000000	2.800000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:27:40.098	2026-02-21 05:27:40.098	\N	\N	0.000000000000000000000000000000	\N
cmlvvnm5u0005j6buhvxntcyc	cmlm76c5y0001vdciu64hkooq	2026-02-06 17:00:00	2026-02-06 23:09:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-07 11:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.020000000000000000000000000000	3.020000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:27:40.531	2026-02-21 05:27:40.531	\N	\N	0.000000000000000000000000000000	\N
cmlvvnmhv0007j6buutl4uddj	cmlm76c5y0001vdciu64hkooq	2026-02-07 17:00:00	2026-02-07 23:09:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-08 11:14:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.080000000000000000000000000000	3.080000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:27:40.963	2026-02-21 05:27:40.963	\N	\N	0.000000000000000000000000000000	\N
cmlvvnmtu0009j6bu6whhls60	cmlm76c5y0001vdciu64hkooq	2026-02-09 17:00:00	2026-02-09 23:12:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-10 11:04:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.870000000000000000000000000000	2.870000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:27:41.395	2026-02-21 05:27:41.395	\N	\N	0.000000000000000000000000000000	\N
cmlvvnn5w000bj6bui4xjge4y	cmlm76c5y0001vdciu64hkooq	2026-02-10 17:00:00	2026-02-10 23:14:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-11 11:02:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.800000000000000000000000000000	2.800000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:27:41.828	2026-02-21 05:27:41.828	\N	\N	0.000000000000000000000000000000	\N
cmlvvnnhw000dj6buiqzvzixf	cmlm76c5y0001vdciu64hkooq	2026-02-11 17:00:00	2026-02-11 23:16:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-12 11:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:27:42.26	2026-02-21 05:27:42.26	\N	\N	0.000000000000000000000000000000	\N
cmlvvnntx000fj6bu2a8tjcji	cmlm76c5y0001vdciu64hkooq	2026-02-12 17:00:00	2026-02-12 23:15:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-13 11:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.830000000000000000000000000000	2.830000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:27:42.693	2026-02-21 05:27:42.693	\N	\N	0.000000000000000000000000000000	\N
cmlvrz2md0003vsi3b33gpbaf	cmlm76c5y0001vdciu64hkooq	2026-02-14 17:00:00	2026-02-14 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-15 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.500000000000000000000000000000	2.500000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:44:36.613	2026-02-21 05:27:43.125	\N	\N	0.000000000000000000000000000000	\N
cmlvrz2wk000bvsi3vsm59j1z	cmlm76c5y0001vdciu64hkooq	2026-02-18 17:00:00	2026-02-19 11:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-18 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 03:44:36.981	2026-02-21 05:27:43.557	\N	\N	0.000000000000000000000000000000	\N
cmlvq9yku0003v692bb54i04y	cml6ctv6r000huqrg08xd4xcm	2026-01-25 17:00:00	2026-01-26 02:55:00	\N	\N	\N	MANUAL	2026-01-26 14:55:00	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.)	\N	\N	2026-02-21 02:57:05.359	2026-02-21 05:55:05.216	\N	\N	0.000000000000000000000000000000	\N
cmlvwt3640011j6bu4922ftzc	cml6ctv6r000huqrg08xd4xcm	2026-02-02 17:00:00	2026-02-03 05:59:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 15:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.270000000000000000000000000000	0.270000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:59:55.468	2026-02-21 05:59:55.468	\N	\N	0.000000000000000000000000000000	\N
cmlbhqhqm00055szh4r9r1qcx	cml6ctv6r000huqrg08xd4xcm	2026-02-06 17:00:00	2026-02-06 23:02:00	16.436301646225970000000000000000	99.511864495819280000000000000000	579pd4	ADMIN_BACKFILL	2026-02-07 06:15:00	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	ADMIN_BACKFILL	APPROVED	6.220000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-07 07:05:30.44	2026-02-06 23:02:36.622	2026-02-21 06:01:03.582	\N	\N	0.000000000000000000000000000000	\N
cmllhwee9000h3r6qaz1ui0ct	cml6ctv6r000huqrg08xd4xcm	2026-02-13 17:00:00	2026-02-13 23:04:00	16.436389473676830000000000000000	99.511761833829420000000000000000	579pd4	ADMIN_BACKFILL	2026-02-14 06:15:00	16.436214441730900000000000000000	99.511714721741550000000000000000	579pd4	ADMIN_BACKFILL	APPROVED	6.180000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-14 07:24:56.284	2026-02-13 23:04:53.986	2026-02-21 06:02:14.731	\N	\N	0.000000000000000000000000000000	\N
cmlvifikm000f11by4uyxkidj	cml6ctv270009uqrg7spxr9d4	2026-02-20 17:00:00	2026-02-20 23:17:26.979	16.436329700000000000000000000000	99.511858399999990000000000000000	vr2ul	QR	2026-02-21 11:14:56.837	16.436304900000000000000000000000	99.511957499999990000000000000000	vr2ul	GPS	APPROVED	10.950000000000000000000000000000	2.950000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:17:27.622	2026-02-21 11:14:57.537	0	2026-02-21 06:09:06.389	0.000000000000000000000000000000	2026-02-21 06:08:53.745
cmlvj29gg0005ojwqi1xyauxa	cml5g1vmh001aua47rlxc2pr1	2026-02-20 17:00:00	2026-02-20 23:35:08.007	16.475202000000000000000000000000	99.553700199999990000000000000000	2hlpr1	QR	2026-02-21 11:34:16.974	16.475150400000000000000000000000	99.553768400000000000000000000000	2hlpr1	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	5	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:35:08.896	2026-02-21 11:34:18.375	82	2026-02-21 05:52:44.637	0.000000000000000000000000000000	2026-02-21 04:30:30.562
cmlmxgv2i0007vk9y3nj6ef4o	cml6ctv6r000huqrg08xd4xcm	2026-02-14 17:00:00	2026-02-14 23:08:00	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	ADMIN_BACKFILL	2026-02-15 06:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	6.120000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.)	cml6ctveb000vuqrg3ulgugaj	2026-02-14 23:31:55.99	2026-02-14 23:08:29.13	2026-02-21 06:03:41.564	\N	\N	0.000000000000000000000000000000	\N
cmlvwwqvn001hj6bu8ywztalv	cml6ctv6r000huqrg08xd4xcm	2026-02-15 17:00:00	2026-02-16 06:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-16 15:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.250000000000000000000000000000	0.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 06:02:45.94	2026-02-21 06:03:54.55	\N	\N	0.000000000000000000000000000000	\N
cmlvwysfx000n12vp1oh8j6ob	cml6ctv6r000huqrg08xd4xcm	2026-02-16 17:00:00	2026-02-17 06:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-17 15:04:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.070000000000000000000000000000	0.070000000000000010000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 06:04:21.501	2026-02-21 06:04:21.501	\N	\N	0.000000000000000000000000000000	\N
cmlvwzg470025j6buvnhr858a	cml6ctv6r000huqrg08xd4xcm	2026-02-17 17:00:00	2026-02-18 06:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-18 15:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.250000000000000000000000000000	0.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 06:04:52.183	2026-02-21 06:04:52.183	\N	\N	0.000000000000000000000000000000	\N
cmlsnf2dl0003rtbnsceu5ak5	cml6ctv6r000huqrg08xd4xcm	2026-02-18 17:00:00	2026-02-18 23:13:00	16.436312249732330000000000000000	99.511862413074710000000000000000	579pd4	ADMIN_BACKFILL	2026-02-19 15:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	15.030000000000000000000000000000	7.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-19 07:31:59.24	2026-02-18 23:13:46.185	2026-02-21 06:04:52.628	\N	\N	0.000000000000000000000000000000	\N
cmluhc8hj0001rpdrcnp51zvx	cml6ctv6r000huqrg08xd4xcm	2026-02-19 17:00:00	2026-02-20 05:59:00	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	ADMIN_BACKFILL	2026-02-20 15:20:00	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	ADMIN_BACKFILL	APPROVED	8.350000000000000000000000000000	0.350000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 05:59:08.791	2026-02-21 06:05:05.929	\N	\N	0.000000000000000000000000000000	\N
cmlvjy1je000bojwqkrk170pu	cml6ctvtp001puqrgr6j1clm9	2026-02-20 17:00:00	2026-02-20 23:59:50.957	16.475172500000000000000000000000	99.553780500000000000000000000000	4zl33m	QR	2026-02-21 09:59:43.91	16.475373000000000000000000000000	99.553819200000010000000000000000	4zl33m	GPS	APPROVED	8.980000000000000000000000000000	0.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:59:51.627	2026-02-21 09:59:44.581	\N	\N	0.000000000000000000000000000000	\N
cmlvjf5pa000j11by0xm9znj8	cml6cv8ts000513l7uydg8j16	2026-02-20 17:00:00	2026-02-20 23:45:09.885	16.475231400000000000000000000000	99.553657200000000000000000000000	-t0727m	QR	2026-02-21 10:27:23.375	16.475153800000000000000000000000	99.553671200000000000000000000000	-t0727m	GPS	APPROVED	9.699999999999999000000000000000	1.700000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:45:10.559	2026-02-21 10:27:24.26	\N	\N	0.000000000000000000000000000000	\N
cmltc7isp00016su24kuioytc	cml6ctvz80021uqrghd4qf3t2	2026-02-18 17:00:00	2026-02-19 10:47:43.548	16.475362300000000000000000000000	99.553591500000000000000000000000	-xr350y	QR	2026-02-19 22:47:43.548	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 10:47:44.617	2026-02-21 10:45:57.487	\N	\N	0.000000000000000000000000000000	\N
cmlx6zrxw001pqi9uwudbla1f	cml5g289u003uua47ulssk26x	2026-01-26 17:00:00	2026-01-27 01:05:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 13:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:49.844	2026-02-22 03:32:49.844	\N	\N	0.000000000000000000000000000000	\N
cmlvwt3hx0013j6bu2c6b0orl	cml6ctv6r000huqrg08xd4xcm	2026-02-03 17:00:00	2026-02-04 06:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 15:31:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.520000000000000000000000000000	0.520000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 05:59:55.893	2026-02-22 03:25:16.039	\N	\N	0.000000000000000000000000000000	\N
cmlx6zl13000xqi9uo0r7rj4p	cml5g1tky000wua47qqpf53wn	2026-02-01 17:00:00	2026-02-02 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	150	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:40.888	2026-02-22 03:32:40.888	\N	\N	0.000000000000000000000000000000	\N
cmlx6zliv000zqi9uz5o2wior	cml5g1tky000wua47qqpf53wn	2026-02-02 17:00:00	2026-02-03 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	90	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:41.527	2026-02-22 03:32:41.527	\N	\N	0.000000000000000000000000000000	\N
cmlx6zm0m0011qi9ucevrvcuk	cml5g1tky000wua47qqpf53wn	2026-02-04 17:00:00	2026-02-05 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	150	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:42.167	2026-02-22 03:32:42.167	\N	\N	0.000000000000000000000000000000	\N
cmlx6zmid0013qi9u2rcoo6zf	cml5g1tky000wua47qqpf53wn	2026-02-06 17:00:00	2026-02-07 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-07 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	180	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:42.806	2026-02-22 03:32:42.806	\N	\N	0.000000000000000000000000000000	\N
cmlx6zn040015qi9un54o08nl	cml5g1tky000wua47qqpf53wn	2026-02-08 17:00:00	2026-02-09 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-09 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	150	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:43.444	2026-02-22 03:32:43.444	\N	\N	0.000000000000000000000000000000	\N
cmlx6znhv0017qi9uc3dc92ym	cml5g1tky000wua47qqpf53wn	2026-02-11 17:00:00	2026-02-12 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-12 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:44.084	2026-02-22 03:32:44.084	\N	\N	0.000000000000000000000000000000	\N
cmlx6znzm0019qi9u2q1dzcm7	cml5g1tky000wua47qqpf53wn	2026-02-12 17:00:00	2026-02-13 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-13 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	30	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:44.723	2026-02-22 03:32:44.723	\N	\N	0.000000000000000000000000000000	\N
cmlx6zohe001bqi9u9l1wwuco	cml5g1tky000wua47qqpf53wn	2026-02-13 17:00:00	2026-02-14 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:45.362	2026-02-22 03:32:45.362	\N	\N	0.000000000000000000000000000000	\N
cmlx6zoz4001dqi9u5qqfn7ml	cml5g1tky000wua47qqpf53wn	2026-02-14 17:00:00	2026-02-14 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-15 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:46.001	2026-02-22 03:32:46.001	\N	\N	0.000000000000000000000000000000	\N
cmlrdttkb000bi6smz4tj4ibr	cml5g1tky000wua47qqpf53wn	2026-02-16 17:00:00	2026-02-17 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-17 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	90	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-18 01:57:32.267	2026-02-22 03:32:47.28	\N	\N	0.000000000000000000000000000000	\N
cmlx6zs9r001rqi9ux8x5dy0y	cml5g289u003uua47ulssk26x	2026-01-27 17:00:00	2026-01-28 02:05:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:50.271	2026-02-22 03:32:50.271	\N	\N	0.000000000000000000000000000000	\N
cmlx6zsll001tqi9up26nrsb0	cml5g289u003uua47ulssk26x	2026-01-28 17:00:00	2026-01-29 00:45:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.250000000000000000000000000000	2.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:50.698	2026-02-22 03:32:50.698	\N	\N	0.000000000000000000000000000000	\N
cmlx6zsxh001vqi9uusv3dohj	cml5g289u003uua47ulssk26x	2026-01-30 17:00:00	2026-01-31 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:51.125	2026-02-22 03:32:51.125	\N	\N	0.000000000000000000000000000000	\N
cmlx6ztf9001xqi9uzyiw59id	cml5g289u003uua47ulssk26x	2026-01-31 17:00:00	2026-02-01 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:51.765	2026-02-22 03:32:51.765	\N	\N	0.000000000000000000000000000000	\N
cmlvht583000511bytdsluo6e	cml5g1xzx001oua47iy5u23oh	2026-02-20 17:00:00	2026-02-20 23:00:02.545	16.475123100000000000000000000000	99.553354200000000000000000000000	c4n38v	QR	2026-02-21 11:00:02.545	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:00:03.892	2026-02-21 23:29:30.583	\N	\N	0.000000000000000000000000000000	\N
cmlvo8y1a000146o2w71nnaxf	cml6ctvja0013uqrgbdjr4l0e	2026-02-20 17:00:00	2026-02-21 02:00:18.128	16.455008800000000000000000000000	99.529906800000010000000000000000	-xk7lgp	QR	2026-02-21 13:55:07.606	16.455063200000000000000000000000	99.529980300000010000000000000000	-cvmrg6	GPS	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 02:00:18.766	2026-02-22 00:41:03.355	88	2026-02-21 08:59:53.695	0.000000000000000000000000000000	2026-02-21 07:31:43.387
cmlvw95y10003onzj6z507l6h	cml5cxygj0003v68ql9533bl3	2026-02-20 17:00:00	2026-02-21 05:44:25.527	16.475028600000000000000000000000	99.553043800000000000000000000000	ymf41f	QR	2026-02-21 14:27:13.77	16.475059900000000000000000000000	99.553584700000000000000000000000	ymf41f	GPS	APPROVED	7.700000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 05:44:25.945	2026-02-22 00:41:03.355	\N	\N	0.000000000000000000000000000000	\N
cmlvwmvqu000712vpj6o9jlks	cml6ctv6r000huqrg08xd4xcm	2026-02-20 17:00:00	2026-02-21 05:55:04.752	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	QR	2026-02-21 15:35:52.857	16.436303062821320000000000000000	99.511855420139990000000000000000	579pd4	GPS	APPROVED	8.670000000000000000000000000000	0.670000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 05:55:05.91	2026-02-22 00:41:03.355	\N	\N	0.000000000000000000000000000000	\N
cmlvo21ey0007x3sild6v3onz	cml6ctvgi000zuqrguiuyi2de	2026-02-20 17:00:00	2026-02-21 01:54:55.893	16.455080400000000000000000000000	99.530114400000000000000000000000	-5m8uqd	QR	2026-02-21 13:54:09.863	16.455087200000000000000000000000	99.530102000000000000000000000000	hl88nd	GPS	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 01:54:56.555	2026-02-22 00:41:03.355	87	2026-02-21 07:28:24.97	0.000000000000000000000000000000	2026-02-21 06:00:39.162
cmlw7pmt10005133ykz8c1k3z	cml6ctv5n000fuqrg94t826wg	2026-02-20 17:00:00	2026-02-21 11:05:09.636	16.436325600000000000000000000000	99.511941200000000000000000000000	-ifqw5k	QR	2026-02-21 23:13:46.579	16.436331100000000000000000000000	99.511849500000000000000000000000	-ifqw5k	GPS	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 11:05:10.069	2026-02-22 00:41:03.355	\N	\N	0.000000000000000000000000000000	\N
cmlvo65ts0009x3si0nqnyuwp	cml5g22hz002gua47temxhj1t	2026-02-20 17:00:00	2026-02-21 01:58:07.837	16.475054300000000000000000000000	99.553126000000010000000000000000	8dlb91	QR	2026-02-21 14:01:48.674	16.475171300000000000000000000000	99.553635200000000000000000000000	8dlb91	GPS	APPROVED	11.050000000000000000000000000000	3.050000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 01:58:08.896	2026-02-22 00:41:03.355	86	2026-02-21 08:30:57.045	0.000000000000000000000000000000	2026-02-21 07:03:59.936
cmlw70xzi00031vpmh81za3m8	cml6ctvz80021uqrghd4qf3t2	2026-02-20 17:00:00	2026-02-21 10:45:57.039	16.475388800000000000000000000000	99.553605500000000000000000000000	-xr350y	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 10:45:58.158	2026-02-22 00:41:03.355	\N	\N	0.000000000000000000000000000000	\N
cmlvwgbk60007onzjgwefj8ry	cml6ctvlp0017uqrgl43h68pm	2026-02-20 17:00:00	2026-02-21 05:49:59.395	16.455099100000000000000000000000	99.530101500000000000000000000000	-jkouny	QR	2026-02-21 14:01:28.512	16.454742800000000000000000000000	99.530076100000000000000000000000	-hp1zn2	GPS	APPROVED	7.180000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 05:49:59.814	2026-02-22 00:41:03.355	\N	\N	0.000000000000000000000000000000	\N
cmlwwxjs80001t20qqfpods8u	cml6ctv3c000buqrguslcci85	2026-02-21 17:00:00	2026-02-21 22:51:09.133	16.436243227004330000000000000000	99.511382784839600000000000000000	gg44cx	QR	2026-02-22 11:11:19.383	16.436524516639470000000000000000	99.511673555367110000000000000000	gg44cx	GPS	APPROVED	11.330000000000000000000000000000	3.330000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 22:51:09.8	2026-02-22 11:11:20.264	62	2026-02-22 04:09:27.648	0.000000000000000000000000000000	2026-02-22 03:06:39.759
cmlww4wwu00016u12eiivb83e	cml6ctvhm0011uqrgd2s6gv12	2026-02-21 17:00:00	2026-02-21 22:28:53.151	16.455024900000000000000000000000	99.530162399999990000000000000000	4uyosu	QR	2026-02-22 04:31:00.414	16.455046400000000000000000000000	99.530173899999990000000000000000	4uyosu	GPS	APPROVED	5.030000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 22:28:53.79	2026-02-22 04:31:01.258	\N	\N	0.000000000000000000000000000000	\N
cmlx103t7000h5wjcq4k4owhn	cml6cv8w4000913l7imruilgz	2026-02-21 17:00:00	2026-02-22 00:45:06.193	16.475022700000000000000000000000	99.552961499999990000000000000000	-7x56ss	QR	2026-02-22 10:12:55.302	16.475166600000000000000000000000	99.553615300000000000000000000000	-x7wvp7	GPS	APPROVED	8.449999999999999000000000000000	0.450000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 00:45:07.532	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlwyavxt00015wjceqqltvbe	cml5g1xzx001oua47iy5u23oh	2026-02-21 17:00:00	2026-02-21 23:29:29.915	16.475092900000000000000000000000	99.553022500000000000000000000000	c4n38v	QR	2026-02-22 11:30:13.258	16.475158900000000000000000000000	99.553573000000000000000000000000	c4n38v	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 23:29:31.697	2026-02-22 11:30:14.142	94	2026-02-22 04:36:17.641	0.000000000000000000000000000000	2026-02-22 03:02:15.078
cmlwxcdsk00015knx748yx9h7	cml6ctuzt0005uqrgdnihhrcg	2026-02-21 17:00:00	2026-02-21 23:02:41.238	16.436337600000000000000000000000	99.511889500000000000000000000000	-xuvpf5	QR	2026-02-22 11:03:11.667	16.436340100000000000000000000000	99.511832000000000000000000000000	-xuvpf5	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 23:02:41.877	2026-02-22 11:03:12.368	63	2026-02-22 05:14:22.53	0.000000000000000000000000000000	2026-02-22 04:11:00.316
cmlwxam9u00076u12t70socc2	cml6ctvnx001buqrgfzjexn6r	2026-02-21 17:00:00	2026-02-21 23:01:18.915	16.455070200000000000000000000000	99.530117000000000000000000000000	-3nueuy	QR	2026-02-22 12:24:01.91	16.455091700000000000000000000000	99.529739699999990000000000000000	-3nueuy	GPS	APPROVED	12.370000000000000000000000000000	4.370000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 23:01:19.554	2026-02-22 12:24:02.758	\N	\N	0.000000000000000000000000000000	\N
cmlwycrxb00075knxlg99nilk	cml5g1vmh001aua47rlxc2pr1	2026-02-21 17:00:00	2026-02-21 23:30:58.114	16.475546000000000000000000000000	99.553462700000000000000000000000	2hlpr1	GPS	2026-02-22 11:31:48.074	16.475206500000000000000000000000	99.553764100000000000000000000000	2hlpr1	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 23:30:59.807	2026-02-22 11:31:49.339	91	2026-02-22 07:35:29.649	0.000000000000000000000000000000	2026-02-22 06:04:28.961
cmlwzh4yn00055wjcrrqipcaz	cml6ctvtp001puqrgr6j1clm9	2026-02-21 17:00:00	2026-02-22 00:02:22.312	16.475146200000000000000000000000	99.553697400000000000000000000000	4zl33m	QR	2026-02-22 09:58:01.48	16.475140800000000000000000000000	99.553688800000000000000000000000	4zl33m	GPS	APPROVED	8.920000000000000000000000000000	0.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-22 00:02:22.944	2026-02-22 09:58:02.147	\N	\N	0.000000000000000000000000000000	\N
cmlwxbq5c00096u126e64lexu	cml5w8h240001ugxaadqh8irg	2026-02-21 17:00:00	2026-02-21 23:02:10.526	16.475236800000000000000000000000	99.553712200000010000000000000000	vpjg0o	QR	2026-02-22 06:18:22.127	16.475337600000000000000000000000	99.553684300000000000000000000000	vpjg0o	GPS	APPROVED	6.270000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 23:02:11.232	2026-02-22 06:18:23.022	\N	\N	0.000000000000000000000000000000	\N
cmlwxol21000b6u12wmo1q6f3	cml6ctv7w000juqrgh1tdiejn	2026-02-21 17:00:00	2026-02-21 23:12:10.523	16.436302600000000000000000000000	99.512050900000010000000000000000	ndj3n5	QR	2026-02-22 06:39:30.712	16.436310200000000000000000000000	99.511933799999990000000000000000	ndj3n5	GPS	APPROVED	6.450000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 23:12:11.161	2026-02-22 06:39:31.645	\N	\N	0.000000000000000000000000000000	\N
cmlwwozjh000b64jp30r365w5	cml6ctvkk0015uqrg9iuy6dh1	2026-02-21 17:00:00	2026-02-21 22:44:29.639	16.454874252523100000000000000000	99.530319696918940000000000000000	phfpd5	QR	2026-02-22 06:46:50.536	16.454816759699580000000000000000	99.530366896648150000000000000000	phfpd5	GPS	APPROVED	7.030000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 22:44:30.317	2026-02-22 06:46:51.2	\N	\N	0.000000000000000000000000000000	\N
cmlwz32bw000h6u12fmximj71	cml6ctvff000xuqrgvuiy6k2z	2026-02-21 17:00:00	2026-02-21 23:00:00	\N	\N	\N	MANUAL	2026-02-22 11:00:00	\N	\N	\N	MANUAL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-21 23:51:26.348	2026-02-22 12:11:51.749	83	2026-02-22 04:25:43.131	0.000000000000000000000000000000	2026-02-22 03:02:20.988
cmlwz4oke00019pdb5dw9uf5v	cml6ctuwf0001uqrgn7ktp9je	2026-02-21 17:00:00	2026-02-21 23:52:41.183	16.436445000000000000000000000000	99.511978300000000000000000000000	vr2ul	QR	2026-02-22 10:07:44.658	16.436276600000000000000000000000	99.511984900000000000000000000000	vr2ul	GPS	APPROVED	9.250000000000000000000000000000	1.250000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 23:52:41.822	2026-02-22 10:07:45.305	\N	\N	0.000000000000000000000000000000	\N
cmlwvtc9j000164jpacy8fuwo	cml5g1qzg000iua472zcpgugd	2026-02-21 17:00:00	2026-02-21 22:19:52.939	16.475183400000000000000000000000	99.553669500000000000000000000000	ntdgyb	QR	2026-02-22 10:31:00.866	16.475164300000000000000000000000	99.553727100000000000000000000000	ntdgyb	GPS	APPROVED	11.180000000000000000000000000000	3.180000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 22:19:53.816	2026-02-22 10:31:01.768	92	2026-02-22 07:35:33.365	0.000000000000000000000000000000	2026-02-22 06:03:07.072
cmlx1fbun0003yg0b4t2x45h9	cml5g1tky000wua47qqpf53wn	2026-02-21 17:00:00	2026-02-22 00:30:00	\N	\N	\N	MANUAL	2026-02-22 12:32:00	\N	\N	\N	MANUAL	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 00:56:57.791	2026-02-22 12:32:36.259	85	2026-02-22 05:58:00	0.000000000000000000000000000000	2026-02-22 04:33:00
cmlx37x950001spyeq0by42dv	cml6ctvms0019uqrg4ft54y7j	2026-01-25 17:00:00	2026-01-26 00:10:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.830000000000000000000000000000	2.830000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 01:47:11.514	2026-02-22 01:47:11.514	\N	\N	0.000000000000000000000000000000	\N
cmlx37xs20003spyegz6raipi	cml6ctvms0019uqrg4ft54y7j	2026-01-26 17:00:00	2026-01-26 17:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 17:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 01:47:12.195	2026-02-22 01:47:12.195	\N	\N	0.000000000000000000000000000000	\N
cmlx37y4p0005spyecpix223w	cml6ctvms0019uqrg4ft54y7j	2026-01-27 17:00:00	2026-01-28 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.500000000000000000000000000000	2.500000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 01:47:12.649	2026-02-22 01:47:12.649	\N	\N	0.000000000000000000000000000000	\N
cmlx46oq40005vbcx5lhl5ge7	cml6ctvms0019uqrg4ft54y7j	2026-01-28 17:00:00	2026-01-29 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 02:14:13.421	2026-02-22 02:14:13.421	\N	\N	0.000000000000000000000000000000	\N
cmlx46p8b0007vbcx8eqnkrjn	cml6ctvms0019uqrg4ft54y7j	2026-01-30 17:00:00	2026-01-31 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 02:14:14.076	2026-02-22 02:14:14.076	\N	\N	0.000000000000000000000000000000	\N
cmlx46pkg0009vbcx6w9w9ymy	cml6ctvms0019uqrg4ft54y7j	2026-02-01 17:00:00	2026-02-02 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 06:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	5.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 02:14:14.512	2026-02-22 02:14:14.512	\N	\N	0.000000000000000000000000000000	\N
cmlx46pwk000bvbcxocoeagwy	cml6ctvms0019uqrg4ft54y7j	2026-02-02 17:00:00	2026-02-03 00:20:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.670000000000000000000000000000	2.670000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 02:14:14.949	2026-02-22 02:14:14.949	\N	\N	0.000000000000000000000000000000	\N
cmlx46q8q000dvbcxvg8v9w0b	cml6ctvms0019uqrg4ft54y7j	2026-02-03 17:00:00	2026-02-04 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 02:14:15.386	2026-02-22 02:14:15.386	\N	\N	0.000000000000000000000000000000	\N
cmlx6bu7r0001cjj7dgi16x2v	cml6ctv7w000juqrgh1tdiejn	2026-02-04 17:00:00	2026-02-05 06:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 15:14:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.230000000000000000000000000000	0.230000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:14:13.048	2026-02-22 03:14:13.048	\N	\N	0.000000000000000000000000000000	\N
cmlx6j0tb0001qi9u2cssk2i5	cml6ctv7w000juqrgh1tdiejn	2026-02-13 17:00:00	2026-02-14 05:50:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 15:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	8.350000000000000000000000000000	0.350000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:19:47.331	2026-02-22 03:19:47.331	\N	\N	0.000000000000000000000000000000	\N
cmlpsfkhs0007wxzi535u8a5l	cml6ctv7w000juqrgh1tdiejn	2026-02-16 17:00:00	2026-02-16 23:10:00	16.436365300000000000000000000000	99.511810800000010000000000000000	rcqple	ADMIN_BACKFILL	2026-02-17 06:20:00	16.436238000000000000000000000000	99.512096600000010000000000000000	rcqple	ADMIN_BACKFILL	APPROVED	6.170000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-17 07:31:59.271	2026-02-16 23:10:49.216	2026-02-22 03:20:46.962	\N	\N	0.000000000000000000000000000000	\N
cmlt1cq31000386e48ozorium	cml6ctv7w000juqrgh1tdiejn	2026-02-18 17:00:00	2026-02-19 05:43:00	16.436422400000000000000000000000	99.511906300000010000000000000000	rcqple	ADMIN_BACKFILL	2026-02-19 15:21:00	16.436319900000000000000000000000	99.511954800000000000000000000000	rcqple	ADMIN_BACKFILL	APPROVED	8.630000000000001000000000000000	0.630000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-20 07:51:17.463	2026-02-19 05:43:51.565	2026-02-22 03:22:38.358	\N	\N	0.000000000000000000000000000000	\N
cmlx6yow3000pspyedfqif1m1	cml6ctv90000luqrg6v3qvfs7	2026-01-31 17:00:00	2026-02-01 15:10:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 23:02:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:31:59.235	2026-02-22 03:31:59.235	\N	\N	0.000000000000000000000000000000	\N
cmlx6zg7k0009qi9ushhggy0g	cml5g22hz002gua47temxhj1t	2026-01-25 17:00:00	2026-01-25 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:34.64	2026-02-22 03:32:34.64	\N	\N	0.000000000000000000000000000000	\N
cmlx6zgpb000bqi9u6yghrvaw	cml5g22hz002gua47temxhj1t	2026-01-26 17:00:00	2026-01-27 01:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 13:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:35.279	2026-02-22 03:32:35.279	\N	\N	0.000000000000000000000000000000	\N
cmlx6zh16000dqi9ujm5ilj3y	cml5g22hz002gua47temxhj1t	2026-01-27 17:00:00	2026-01-27 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:35.707	2026-02-22 03:32:35.707	\N	\N	0.000000000000000000000000000000	\N
cmlx6zhd2000fqi9uewga3jaq	cml5g22hz002gua47temxhj1t	2026-01-28 17:00:00	2026-01-28 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:36.134	2026-02-22 03:32:36.134	\N	\N	0.000000000000000000000000000000	\N
cmlx6zhox000hqi9uac3fbrds	cml5g22hz002gua47temxhj1t	2026-01-29 17:00:00	2026-01-29 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:36.561	2026-02-22 03:32:36.561	\N	\N	0.000000000000000000000000000000	\N
cmlx6zidx000jqi9uow55vtjv	cml5g22hz002gua47temxhj1t	2026-02-03 17:00:00	2026-02-04 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 13:56:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.930000000000000000000000000000	2.930000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:37.461	2026-02-22 03:32:37.461	\N	\N	0.000000000000000000000000000000	\N
cmlx6zips000lqi9uirdpryiw	cml5g1tky000wua47qqpf53wn	2026-01-25 17:00:00	2026-01-26 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:37.888	2026-02-22 03:32:37.888	\N	\N	0.000000000000000000000000000000	\N
cmlx6zj1n000nqi9u2f2lbk0l	cml5g1tky000wua47qqpf53wn	2026-01-26 17:00:00	2026-01-27 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:38.315	2026-02-22 03:32:38.315	\N	\N	0.000000000000000000000000000000	\N
cmlx6zjdw000pqi9u8ghmcbhm	cml5g1tky000wua47qqpf53wn	2026-01-28 17:00:00	2026-01-29 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:38.756	2026-02-22 03:32:38.756	\N	\N	0.000000000000000000000000000000	\N
cmlx6zjpr000rqi9uqyhytwas	cml5g1tky000wua47qqpf53wn	2026-01-29 17:00:00	2026-01-30 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:39.183	2026-02-22 03:32:39.183	\N	\N	0.000000000000000000000000000000	\N
cmlx6zk1l000tqi9uamtdk37k	cml5g1tky000wua47qqpf53wn	2026-01-30 17:00:00	2026-01-31 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:39.61	2026-02-22 03:32:39.61	\N	\N	0.000000000000000000000000000000	\N
cmlx6zkjc000vqi9u4b17zdss	cml5g1tky000wua47qqpf53wn	2026-01-31 17:00:00	2026-01-31 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:40.249	2026-02-22 03:32:40.249	\N	\N	0.000000000000000000000000000000	\N
cmlx0qjzj000d5wjcacchv305	cml6ctuyp0003uqrgejbtvcmm	2026-02-21 17:00:00	2026-02-22 00:37:41.253	16.436445200000000000000000000000	99.511901100000000000000000000000	ysf08w	QR	2026-02-22 12:37:53.403	16.436274600000000000000000000000	99.512080999999990000000000000000	ysf08w	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-22 00:37:41.935	2026-02-22 12:37:54.066	\N	\N	0.000000000000000000000000000000	\N
cmlwzr5xl00075wjc10ygy821	cml6ctv0x0007uqrgprf5lu7c	2026-02-21 17:00:00	2026-02-22 00:10:10.12	16.436330734565040000000000000000	99.511694393203400000000000000000	-85vz5c	QR	2026-02-22 12:18:23.471	16.436394582692870000000000000000	99.511786308664740000000000000000	-85vz5c	GPS	APPROVED	11.130000000000000000000000000000	3.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-22 00:10:10.761	2026-02-22 12:18:24.406	58	2026-02-22 06:14:54.724	0.000000000000000000000000000000	2026-02-22 05:16:28.553
cmlx3mhxz0001vbcxduuof3e9	cml6ctvja0013uqrgbdjr4l0e	2026-02-21 17:00:00	2026-02-22 01:58:30.882	16.455107800000000000000000000000	99.530130300000000000000000000000	-xk7lgp	QR	2026-02-22 13:53:26.502	16.455090500000000000000000000000	99.530097600000000000000000000000	-cvmrg6	GPS	APPROVED	10.900000000000000000000000000000	2.900000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-22 03:02:01.073	2026-02-22 01:58:31.511	2026-02-22 13:53:27.436	88	2026-02-22 08:59:58.83	0.000000000000000000000000000000	2026-02-22 07:31:57.656
cmlx0kszt000b5wjcfdlf0bvu	cml6ctvrh001luqrg60imh1k9	2026-02-21 17:00:00	2026-02-22 00:33:12.612	16.475343800000000000000000000000	99.553206600000000000000000000000	-xuvpf5	QR	2026-02-22 09:08:23.817	16.475181700000000000000000000000	99.553630700000000000000000000000	-xuvpf5	GPS	APPROVED	7.580000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-22 00:33:13.673	2026-02-22 09:08:25.234	\N	\N	0.000000000000000000000000000000	\N
cmlx02mm300095wjc6daqkl4g	cml6cv8qd000113l7pz55vip3	2026-02-21 17:00:00	2026-02-22 00:19:04.923	16.455100700000000000000000000000	99.530069500000000000000000000000	-xgf12i	QR	2026-02-22 10:06:45.979	16.454999600000000000000000000000	99.529794800000000000000000000000	-xgf12i	GPS	APPROVED	8.779999999999999000000000000000	0.780000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-22 00:19:05.595	2026-02-22 10:06:46.621	\N	\N	0.000000000000000000000000000000	\N
cmlx0rnyq000f5wjc0x7lixg8	cml6ctva5000nuqrg8wh05sro	2026-02-21 17:00:00	2026-02-22 00:38:33.1	16.436228000000000000000000000000	99.512080000000000000000000000000	10dh5d	QR	2026-02-22 12:39:26.622	16.436332000000000000000000000000	99.511862600000000000000000000000	10dh5d	GPS	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-22 00:38:33.746	2026-02-22 12:39:27.46	\N	\N	0.000000000000000000000000000000	\N
cmlx3lur30009spye87pu6ctq	cml6ctvgi000zuqrguiuyi2de	2026-02-21 17:00:00	2026-02-22 01:58:00.809	16.455060800000000000000000000000	99.530130700000000000000000000000	-5m8uqd	QR	2026-02-22 13:53:16.413	16.455071100000000000000000000000	99.530132200000000000000000000000	-xmb8l4	GPS	APPROVED	10.920000000000000000000000000000	2.920000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	cml6ctveb000vuqrg3ulgugaj	2026-02-22 03:02:07.398	2026-02-22 01:58:01.455	2026-02-22 13:53:17.081	86	2026-02-22 07:27:34.702	0.000000000000000000000000000000	2026-02-22 06:00:55.914
cmlx6ztx0001zqi9uuwbjppyr	cml5g289u003uua47ulssk26x	2026-02-02 17:00:00	2026-02-03 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 01:06:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:52.404	2026-02-22 03:32:52.404	\N	\N	0.000000000000000000000000000000	\N
cmlx6zuer0021qi9uzgdn8dru	cml5g289u003uua47ulssk26x	2026-02-03 17:00:00	2026-02-04 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 04:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	1.500000000000000000000000000000	0.000000000000000000000000000000	60	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:53.043	2026-02-22 03:32:53.043	\N	\N	0.000000000000000000000000000000	\N
cmlx6zuwi0023qi9u7lg6vig7	cml5g289u003uua47ulssk26x	2026-02-04 17:00:00	2026-02-05 02:07:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.880000000000000000000000000000	2.880000000000000000000000000000	7	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:53.682	2026-02-22 03:32:53.682	\N	\N	0.000000000000000000000000000000	\N
cmld46rlf0001otwhsq91pnfw	cml5g289u003uua47ulssk26x	2026-02-07 17:00:00	2026-02-08 02:15:00	16.475350700000000000000000000000	99.553692700000000000000000000000	ktr8uu	ADMIN_BACKFILL	2026-02-08 13:54:00	16.475178400000000000000000000000	99.553677100000000000000000000000	ktr8uu	ADMIN_BACKFILL	APPROVED	10.650000000000000000000000000000	2.650000000000000000000000000000	75	\N	100.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-09 07:43:30.464	2026-02-08 02:18:53.619	2026-02-22 03:32:54.321	85	2026-02-08 07:29:57.389	0.000000000000000000000000000000	2026-02-08 06:04:47.118
cmlit9mot0005er3nj0z7cif8	cml5g289u003uua47ulssk26x	2026-02-11 17:00:00	2026-02-12 01:00:00	16.475083200000000000000000000000	99.553864300000000000000000000000	ktr8uu	ADMIN_BACKFILL	2026-02-12 13:00:00	16.475305800000000000000000000000	99.553644400000000000000000000000	ktr8uu	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-13 07:40:02.307	2026-02-12 01:59:48.509	2026-02-22 03:32:55.651	89	2026-02-12 07:05:21.4	0.000000000000000000000000000000	2026-02-12 05:36:06.01
cmlx6zwwz002bqi9uwt2dzptm	cml5g289u003uua47ulssk26x	2026-02-13 17:00:00	2026-02-14 01:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 13:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:56.291	2026-02-22 03:32:56.291	\N	\N	0.000000000000000000000000000000	\N
cmlx6zx8u002dqi9uyyxvudiu	cml5g20im0022ua4780xu5bou	2026-01-25 17:00:00	2026-01-26 00:01:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.980000000000000000000000000000	2.980000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:56.718	2026-02-22 03:32:56.718	\N	\N	0.000000000000000000000000000000	\N
cmlx6zxko002fqi9uh0p85rlt	cml5g20im0022ua4780xu5bou	2026-01-26 17:00:00	2026-01-27 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:57.145	2026-02-22 03:32:57.145	\N	\N	0.000000000000000000000000000000	\N
cmlx6zxwj002hqi9u3blcbpnu	cml5g20im0022ua4780xu5bou	2026-01-27 17:00:00	2026-01-28 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:57.571	2026-02-22 03:32:57.571	\N	\N	0.000000000000000000000000000000	\N
cmlx6zy8f002jqi9ufl6ttbdq	cml5g20im0022ua4780xu5bou	2026-01-28 17:00:00	2026-01-28 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:57.999	2026-02-22 03:32:57.999	\N	\N	0.000000000000000000000000000000	\N
cmlx6zyka002lqi9uyojhxrvz	cml5g20im0022ua4780xu5bou	2026-01-29 17:00:00	2026-01-30 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:58.426	2026-02-22 03:32:58.426	\N	\N	0.000000000000000000000000000000	\N
cmlx6zz21002nqi9uqcwf5hsx	cml5g20im0022ua4780xu5bou	2026-01-31 17:00:00	2026-02-01 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:59.065	2026-02-22 03:32:59.065	\N	\N	0.000000000000000000000000000000	\N
cmlx6zzjs002pqi9uqtqce1ig	cml5g20im0022ua4780xu5bou	2026-02-01 17:00:00	2026-02-02 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:32:59.704	2026-02-22 03:32:59.704	\N	\N	0.000000000000000000000000000000	\N
cmlx7001j002rqi9unp944xga	cml5g20im0022ua4780xu5bou	2026-02-02 17:00:00	2026-02-03 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:00.343	2026-02-22 03:33:00.343	\N	\N	0.000000000000000000000000000000	\N
cmlx700j9002tqi9ue40yctra	cml5g20im0022ua4780xu5bou	2026-02-03 17:00:00	2026-02-04 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 13:53:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.880000000000000000000000000000	2.880000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:00.982	2026-02-22 03:33:00.982	\N	\N	0.000000000000000000000000000000	\N
cmlx70111002vqi9u4maxn6ch	cml5g20im0022ua4780xu5bou	2026-02-14 17:00:00	2026-02-15 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-15 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:01.621	2026-02-22 03:33:01.621	\N	\N	0.000000000000000000000000000000	\N
cmlx701cw002xqi9uezyr70sh	cml5g1xzx001oua47iy5u23oh	2026-01-25 17:00:00	2026-01-26 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:02.048	2026-02-22 03:33:02.048	\N	\N	0.000000000000000000000000000000	\N
cmlx701oq002zqi9ucovylslz	cml5g1xzx001oua47iy5u23oh	2026-01-26 17:00:00	2026-01-27 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:02.475	2026-02-22 03:33:02.475	\N	\N	0.000000000000000000000000000000	\N
cmlx7020m0031qi9u73ksdhnp	cml5g1xzx001oua47iy5u23oh	2026-01-27 17:00:00	2026-01-28 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:02.902	2026-02-22 03:33:02.902	\N	\N	0.000000000000000000000000000000	\N
cmlx702ch0033qi9uoo4829qo	cml5g1xzx001oua47iy5u23oh	2026-01-28 17:00:00	2026-01-29 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:03.329	2026-02-22 03:33:03.329	\N	\N	0.000000000000000000000000000000	\N
cmlx702oc0035qi9uuh5az8at	cml5g1xzx001oua47iy5u23oh	2026-01-29 17:00:00	2026-01-30 02:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 14:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:03.756	2026-02-22 03:33:03.756	\N	\N	0.000000000000000000000000000000	\N
cmlx703620037qi9us1kfufs2	cml5g1xzx001oua47iy5u23oh	2026-01-31 17:00:00	2026-02-01 00:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 12:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	30	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:04.394	2026-02-22 03:33:04.394	\N	\N	0.000000000000000000000000000000	\N
cmlx703tv0039qi9u8ff3fjby	cml5g1xzx001oua47iy5u23oh	2026-02-01 17:00:00	2026-02-01 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:05.04	2026-02-22 03:33:05.04	\N	\N	0.000000000000000000000000000000	\N
cmlx704bm003bqi9ucismqxrc	cml5g1xzx001oua47iy5u23oh	2026-02-02 17:00:00	2026-02-02 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:05.891	2026-02-22 03:33:05.891	\N	\N	0.000000000000000000000000000000	\N
cmlx704te003dqi9u7qmzrx2z	cml5g1xzx001oua47iy5u23oh	2026-02-03 17:00:00	2026-02-04 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:06.53	2026-02-22 03:33:06.53	\N	\N	0.000000000000000000000000000000	\N
cmlrdqqky0001i6sm0527s5e4	cml5g1xzx001oua47iy5u23oh	2026-02-17 17:00:00	2026-02-17 23:40:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-18 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	10.330000000000000000000000000000	2.330000000000000000000000000000	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.)	\N	\N	2026-02-18 01:55:08.434	2026-02-22 03:33:08.447	\N	\N	0.000000000000000000000000000000	\N
cmlx706mh003lqi9ua8lczlfq	cml5g1vmh001aua47rlxc2pr1	2026-01-25 17:00:00	2026-01-25 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:08.874	2026-02-22 03:33:08.874	\N	\N	0.000000000000000000000000000000	\N
cmlx706yc003nqi9ugss2tsiu	cml5g1vmh001aua47rlxc2pr1	2026-01-26 17:00:00	2026-01-26 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:09.301	2026-02-22 03:33:09.301	\N	\N	0.000000000000000000000000000000	\N
cmlx707a7003pqi9uffsbl3wg	cml5g1vmh001aua47rlxc2pr1	2026-01-27 17:00:00	2026-01-27 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:09.728	2026-02-22 03:33:09.728	\N	\N	0.000000000000000000000000000000	\N
cmlx707m2003rqi9uybxr3mwn	cml5g1vmh001aua47rlxc2pr1	2026-01-28 17:00:00	2026-01-28 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-29 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:10.155	2026-02-22 03:33:10.155	\N	\N	0.000000000000000000000000000000	\N
cmlx707xx003tqi9u64tbebll	cml5g1vmh001aua47rlxc2pr1	2026-01-30 17:00:00	2026-01-30 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:10.581	2026-02-22 03:33:10.581	\N	\N	0.000000000000000000000000000000	\N
cmlx708fo003vqi9uow8t5weu	cml5g1vmh001aua47rlxc2pr1	2026-01-31 17:00:00	2026-02-01 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 12:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:11.22	2026-02-22 03:33:11.22	\N	\N	0.000000000000000000000000000000	\N
cmlx708xe003xqi9u2s49ioqf	cml5g1vmh001aua47rlxc2pr1	2026-02-01 17:00:00	2026-02-01 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:11.859	2026-02-22 03:33:11.859	\N	\N	0.000000000000000000000000000000	\N
cmlx709f5003zqi9uw0os8ai2	cml5g1vmh001aua47rlxc2pr1	2026-02-02 17:00:00	2026-02-02 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 11:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:12.497	2026-02-22 03:33:12.497	\N	\N	0.000000000000000000000000000000	\N
cmlx709ww0041qi9uzjjgotjq	cml5g1vmh001aua47rlxc2pr1	2026-02-03 17:00:00	2026-02-03 23:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 23:32:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:13.136	2026-02-22 03:33:13.136	\N	\N	0.000000000000000000000000000000	\N
cmlx70aet0043qi9udypxembb	cml5g1vmh001aua47rlxc2pr1	2026-02-04 17:00:00	2026-02-05 00:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 00:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:13.781	2026-02-22 03:33:13.781	\N	\N	0.000000000000000000000000000000	\N
cmlr8q7c00001y7gul8e8z064	cml5g1vmh001aua47rlxc2pr1	2026-02-17 17:00:00	2026-02-17 23:34:00	16.475230700000000000000000000000	99.553743200000000000000000000000	2hlpr1	ADMIN_BACKFILL	2026-02-18 05:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	4.930000000000000000000000000000	0.000000000000000000000000000000	4	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-18 07:31:59.292	2026-02-17 23:34:45.408	2026-02-22 03:33:15.06	\N	\N	0.000000000000000000000000000000	\N
cmlx70bq60049qi9u74sqzuec	cml5g1qzg000iua472zcpgugd	2026-01-25 17:00:00	2026-01-25 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-26 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:15.487	2026-02-22 03:33:15.487	\N	\N	0.000000000000000000000000000000	\N
cmlx70c21004bqi9uao3rktnc	cml5g1qzg000iua472zcpgugd	2026-01-26 17:00:00	2026-01-26 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-27 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:15.914	2026-02-22 03:33:15.914	\N	\N	0.000000000000000000000000000000	\N
cmlx70cdw004dqi9uprh1qg38	cml5g1qzg000iua472zcpgugd	2026-01-27 17:00:00	2026-01-27 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-28 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:16.341	2026-02-22 03:33:16.341	\N	\N	0.000000000000000000000000000000	\N
cmlx70cpr004fqi9u84m5i1bj	cml5g1qzg000iua472zcpgugd	2026-01-29 17:00:00	2026-01-29 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-30 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:16.768	2026-02-22 03:33:16.768	\N	\N	0.000000000000000000000000000000	\N
cmlx70d1m004hqi9ur0fsrbwk	cml5g1qzg000iua472zcpgugd	2026-01-30 17:00:00	2026-01-30 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-01-31 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:17.195	2026-02-22 03:33:17.195	\N	\N	0.000000000000000000000000000000	\N
cmlx70djd004jqi9u4q8erehw	cml5g1qzg000iua472zcpgugd	2026-01-31 17:00:00	2026-01-31 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:17.833	2026-02-22 03:33:17.833	\N	\N	0.000000000000000000000000000000	\N
cmlx70e14004lqi9uw8mqmbga	cml5g1qzg000iua472zcpgugd	2026-02-01 17:00:00	2026-02-01 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 11:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:18.472	2026-02-22 03:33:18.472	\N	\N	0.000000000000000000000000000000	\N
cmlx70eiu004nqi9uyyvv8ulq	cml5g1qzg000iua472zcpgugd	2026-02-02 17:00:00	2026-02-02 22:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 10:30:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.000000000000000000000000000000	3.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:19.11	2026-02-22 03:33:19.11	\N	\N	0.000000000000000000000000000000	\N
cmlx70f0z004pqi9u3tz6602y	cml5g1qzg000iua472zcpgugd	2026-02-03 17:00:00	2026-02-03 23:00:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 11:02:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	11.030000000000000000000000000000	3.030000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:33:19.763	2026-02-22 03:33:19.763	\N	\N	0.000000000000000000000000000000	\N
cmlx77ha6000jcjj7qgaxaqxj	cml6ctv90000luqrg6v3qvfs7	2026-02-01 17:00:00	2026-02-02 15:15:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-01 23:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:49.278	2026-02-22 03:38:49.278	\N	\N	0.000000000000000000000000000000	\N
cmlx77hrw000lcjj7a9gr98gz	cml6ctv90000luqrg6v3qvfs7	2026-02-02 17:00:00	2026-02-03 15:15:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-02 23:00:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:49.916	2026-02-22 03:38:49.916	\N	\N	0.000000000000000000000000000000	\N
cmlx77i3q000ncjj7z6a6y9c3	cml6ctv90000luqrg6v3qvfs7	2026-02-03 17:00:00	2026-02-04 15:15:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-03 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:50.343	2026-02-22 03:38:50.343	\N	\N	0.000000000000000000000000000000	\N
cmlx77ifl000pcjj7j5b4kebz	cml6ctv90000luqrg6v3qvfs7	2026-02-04 17:00:00	2026-02-05 15:31:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-04 23:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:50.769	2026-02-22 03:38:50.769	\N	\N	0.000000000000000000000000000000	\N
cmlx77irh000rcjj7dojve8qd	cml6ctv90000luqrg6v3qvfs7	2026-02-05 17:00:00	2026-02-06 15:15:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-05 23:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:51.198	2026-02-22 03:38:51.198	\N	\N	0.000000000000000000000000000000	\N
cmlx77j3c000tcjj7tlkqyouz	cml6ctv90000luqrg6v3qvfs7	2026-02-06 17:00:00	2026-02-07 15:20:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-06 23:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:51.624	2026-02-22 03:38:51.624	\N	\N	0.000000000000000000000000000000	\N
cmlx77jfc000vcjj79zznt67z	cml6ctv90000luqrg6v3qvfs7	2026-02-07 17:00:00	2026-02-08 15:17:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-07 23:02:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:52.056	2026-02-22 03:38:52.056	\N	\N	0.000000000000000000000000000000	\N
cmlx77jr6000xcjj7j0rbsvd8	cml6ctv90000luqrg6v3qvfs7	2026-02-08 17:00:00	2026-02-09 15:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-08 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:52.483	2026-02-22 03:38:52.483	\N	\N	0.000000000000000000000000000000	\N
cmlx77k31000zcjj76pkj1mgb	cml6ctv90000luqrg6v3qvfs7	2026-02-09 17:00:00	2026-02-10 15:22:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-09 23:06:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:52.909	2026-02-22 03:38:52.909	\N	\N	0.000000000000000000000000000000	\N
cmlx77kew0011cjj74orlknnm	cml6ctv90000luqrg6v3qvfs7	2026-02-10 17:00:00	2026-02-11 15:12:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-10 23:11:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:53.336	2026-02-22 03:38:53.336	\N	\N	0.000000000000000000000000000000	\N
cmlx77kqq0013cjj7g8docxli	cml6ctv90000luqrg6v3qvfs7	2026-02-11 17:00:00	2026-02-12 15:30:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-11 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:53.763	2026-02-22 03:38:53.763	\N	\N	0.000000000000000000000000000000	\N
cmlx77l2l0015cjj7r418tt2c	cml6ctv90000luqrg6v3qvfs7	2026-02-12 17:00:00	2026-02-13 15:25:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-12 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:54.189	2026-02-22 03:38:54.189	\N	\N	0.000000000000000000000000000000	\N
cmlx77leg0017cjj7xdl15ln5	cml6ctv90000luqrg6v3qvfs7	2026-02-13 17:00:00	2026-02-14 15:11:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-13 23:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:54.616	2026-02-22 03:38:54.616	\N	\N	0.000000000000000000000000000000	\N
cmlx77lqb0019cjj7m6z1ahll	cml6ctv90000luqrg6v3qvfs7	2026-02-14 17:00:00	2026-02-15 15:15:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-14 23:08:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:55.043	2026-02-22 03:38:55.043	\N	\N	0.000000000000000000000000000000	\N
cmlx77m26001bcjj7aixrglff	cml6ctv90000luqrg6v3qvfs7	2026-02-15 17:00:00	2026-02-16 15:15:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-15 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:55.47	2026-02-22 03:38:55.47	\N	\N	0.000000000000000000000000000000	\N
cmlx77me0001dcjj71ud6fskg	cml6ctv90000luqrg6v3qvfs7	2026-02-16 17:00:00	2026-02-17 15:15:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-16 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:55.896	2026-02-22 03:38:55.896	\N	\N	0.000000000000000000000000000000	\N
cmlx77mq1001fcjj7ht89wvyg	cml6ctv90000luqrg6v3qvfs7	2026-02-17 17:00:00	2026-02-18 15:20:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-17 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:56.329	2026-02-22 03:38:56.329	\N	\N	0.000000000000000000000000000000	\N
cmlx77n1v001hcjj783ludewl	cml6ctv90000luqrg6v3qvfs7	2026-02-18 17:00:00	2026-02-19 15:25:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-18 23:15:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:56.755	2026-02-22 03:38:56.755	\N	\N	0.000000000000000000000000000000	\N
cmlx77ndp001jcjj744y1ct1u	cml6ctv90000luqrg6v3qvfs7	2026-02-19 17:00:00	2026-02-20 15:19:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-19 23:10:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:57.181	2026-02-22 03:38:57.181	\N	\N	0.000000000000000000000000000000	\N
cmlx77npk001lcjj7nlet88qf	cml6ctv90000luqrg6v3qvfs7	2026-02-20 17:00:00	2026-02-21 15:35:00	\N	\N	\N	ADMIN_BACKFILL	2026-02-20 23:05:00	\N	\N	\N	ADMIN_BACKFILL	APPROVED	0.000000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-22 03:38:57.608	2026-02-22 03:38:57.608	\N	\N	0.000000000000000000000000000000	\N
cmlwzuvf3000n6u12550uvedg	cml5waf57000114p7u4pb0j1l	2026-02-21 17:00:00	2026-02-22 00:13:02.421	16.475218500000000000000000000000	99.553687500000000000000000000000	vr2ul	GPS	2026-02-22 08:58:14.346	16.475544000000000000000000000000	99.553839400000000000000000000000	vr2ul	GPS	APPROVED	7.750000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-22 00:13:03.759	2026-02-22 08:58:15.198	\N	\N	0.000000000000000000000000000000	\N
cmlwzvbwx000p6u124b633h7n	cml6ctvms0019uqrg4ft54y7j	2026-02-21 17:00:00	2026-02-22 00:13:24.467	16.455071000000000000000000000000	99.530016399999990000000000000000	-5m8uqd	QR	2026-02-22 12:02:51.931	16.455104200000000000000000000000	99.530296100000000000000000000000	-y6am8r	GPS	APPROVED	10.820000000000000000000000000000	2.820000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-22 00:13:25.138	2026-02-22 12:02:52.783	63	2026-02-22 06:03:46.11	0.000000000000000000000000000000	2026-02-22 05:00:07.361
cmlybf1x800013oyta41xdod7	cml5g1qzg000iua472zcpgugd	2026-02-22 17:00:00	2026-02-22 22:24:25.483	16.475133000000000000000000000000	99.553725800000000000000000000000	ntdgyb	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 22:24:27.26	2026-02-23 05:59:33.697	86	2026-02-23 05:59:32.557	0.000000000000000000000000000000	2026-02-23 04:32:59.997
cmlww5zyz00056u121qhnizt3	cml6ctveb000vuqrg3ulgugaj	2026-02-21 17:00:00	2026-02-21 22:29:43.773	16.455125900000000000000000000000	99.530100100000000000000000000000	-g2tc5p	QR	2026-02-22 14:00:00	\N	\N	\N	MANUAL	APPROVED	14.500000000000000000000000000000	6.500000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-22 07:41:03.354	2026-02-21 22:29:44.411	2026-02-22 14:37:08.163	\N	\N	0.000000000000000000000000000000	\N
cmlyd5151000jdq9yvw9f7flq	cml6ctv7w000juqrgh1tdiejn	2026-02-22 17:00:00	2026-02-22 23:12:38.246	16.436370600000000000000000000000	99.511936199999990000000000000000	ndj3n5	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:12:38.917	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlxn8z2m0003gtvs7w19y999	cml6ctv5n000fuqrg94t826wg	2026-02-21 17:00:00	2026-02-22 11:07:52.391	16.436298800000000000000000000000	99.511895100000000000000000000000	-ifqw5k	QR	2026-02-22 23:17:18.563	16.436182000000000000000000000000	99.511964300000000000000000000000	-ifqw5k	GPS	APPROVED	11.150000000000000000000000000000	3.150000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 11:07:52.846	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyd8ot00001rz928myuzzlb	cml6ctv270009uqrg7spxr9d4	2026-02-22 17:00:00	2026-02-22 23:15:28.889	16.436302900000000000000000000000	99.511836200000000000000000000000	vr2ul	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:15:29.557	2026-02-23 05:04:25.194	0	2026-02-23 05:04:24.513	0.000000000000000000000000000000	2026-02-23 05:04:09.779
cmlydrzua00076odtrcsu5wfl	cml5g1vmh001aua47rlxc2pr1	2026-02-22 17:00:00	2026-02-22 23:30:28.624	16.475192300000000000000000000000	99.553800100000000000000000000000	2hlpr1	GPS	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:30:30.322	2026-02-23 05:29:07.1	88	2026-02-23 05:29:05.957	0.000000000000000000000000000000	2026-02-23 04:00:42.929
cmlyckpo200016odtfx5pehb8	cml5w8h240001ugxaadqh8irg	2026-02-22 17:00:00	2026-02-22 22:56:50.245	16.475326000000000000000000000000	99.553595500000000000000000000000	vpjg0o	QR	2026-02-23 05:53:06.616	16.475184300000000000000000000000	99.553648400000000000000000000000	vpjg0o	GPS	APPROVED	5.930000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 22:56:50.93	2026-02-23 05:53:07.071	\N	\N	0.000000000000000000000000000000	\N
cmlvj37040007ojwqrw1snro9	cml6cv8uy000713l7zocqn0fn	2026-02-20 17:00:00	2026-02-20 23:35:51.068	16.474421400000000000000000000000	99.553624900000000000000000000000	-xr350y	QR	2026-02-21 11:35:51.068	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 23:35:52.372	2026-02-22 23:38:28.203	\N	\N	0.000000000000000000000000000000	\N
cmlx1e7c60001yg0bl992fg19	cml6ctvp6001fuqrgjo0cut8g	2026-02-21 17:00:00	2026-02-22 00:56:04.604	16.455075400000000000000000000000	99.530106900000010000000000000000	-ilt8ll	QR	2026-02-22 10:04:07.518	16.454957200000000000000000000000	99.530215700000000000000000000000	-ilt8ll	GPS	APPROVED	8.130000000000001000000000000000	0.130000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 00:56:05.286	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlx3p3w1000bspyeto7vk61j	cml5g289u003uua47ulssk26x	2026-02-21 17:00:00	2026-02-22 02:00:32.091	16.475081400000000000000000000000	99.553853500000000000000000000000	-rrm7pw	GPS	\N	\N	\N	\N	\N	APPROVED	\N	\N	60	\N	50.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 02:00:33.265	2026-02-23 00:30:11.247	100	2026-02-22 08:43:28.606	26.666666666666670000000000000000	2026-02-22 07:02:28.758
cmlx3rc8x000dspyejlvkzyp6	cml5g22hz002gua47temxhj1t	2026-02-21 17:00:00	2026-02-22 02:02:16.343	16.475317700000000000000000000000	99.553773500000010000000000000000	8dlb91	QR	2026-02-22 14:14:49.401	16.475177500000000000000000000000	99.553667300000000000000000000000	8dlb91	GPS	APPROVED	11.200000000000000000000000000000	3.200000000000000000000000000000	2	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 02:02:17.409	2026-02-23 00:30:11.247	85	2026-02-22 09:07:14.62	0.000000000000000000000000000000	2026-02-22 07:41:15.792
cmlxc1zz4000146cv0eh1ytz8	cml6ctvlp0017uqrgl43h68pm	2026-02-21 17:00:00	2026-02-22 05:54:31.206	16.455108300000000000000000000000	99.530103700000000000000000000000	-jkouny	QR	2026-02-22 14:01:14.365	16.454823600000000000000000000000	99.529994800000000000000000000000	-jkouny	GPS	APPROVED	7.100000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 05:54:31.649	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlxc87ij0001tivdb5efmi56	cml6ctv6r000huqrg08xd4xcm	2026-02-21 17:00:00	2026-02-22 05:59:20.92	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	QR	2026-02-22 15:42:28.581	16.436522477185210000000000000000	99.511802455136060000000000000000	579pd4	GPS	APPROVED	8.720000000000001000000000000000	0.720000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 05:59:21.355	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlxctsac00018ut19bzvgkni	cml5cxygj0003v68ql9533bl3	2026-02-21 17:00:00	2026-02-22 06:16:07.632	16.475060400000000000000000000000	99.553310200000000000000000000000	ymf41f	QR	2026-02-22 14:28:44.474	16.475205000000000000000000000000	99.553681700000000000000000000000	ymf41f	GPS	APPROVED	7.200000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 06:16:08.052	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlycrfbf00036odtr8rhyjd8	cml6ctvnx001buqrgfzjexn6r	2026-02-22 17:00:00	2026-02-22 23:02:03.456	16.455061200000000000000000000000	99.530058299999990000000000000000	-3nueuy	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:02:04.107	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlye299m0003rz92wrcr47tb	cml6cv8uy000713l7zocqn0fn	2026-02-22 17:00:00	2026-02-22 23:38:27.779	16.475274200000000000000000000000	99.553559100000000000000000000000	-xr350y	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:38:29.098	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyeewgn00013koo1crd5egk	cml6cv8ts000513l7uydg8j16	2026-02-22 17:00:00	2026-02-22 23:48:18.385	16.475212700000000000000000000000	99.553733400000000000000000000000	-t0727m	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:48:19.031	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyemr6v00096odt1bkd61n5	cml6cv8sm000313l7yhueq5zy	2026-02-22 17:00:00	2026-02-22 23:54:24.81	16.455105800000000000000000000000	99.530185399999990000000000000000	-oka4kb	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:54:25.447	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyeorrx00033kooespzredq	cml6ctuwf0001uqrgn7ktp9je	2026-02-22 17:00:00	2026-02-22 23:55:58.881	16.436217800000000000000000000000	99.512134900000010000000000000000	vr2ul	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:55:59.517	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyeouzo00053koo6zc8qn6o	cml6ctvsk001nuqrgooayfxde	2026-02-22 17:00:00	2026-02-22 23:56:02.607	16.475170700000000000000000000000	99.553642600000000000000000000000	-xk7lgp	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:56:03.684	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyeqpph000b6odtdr7gw608	cml6ctvtp001puqrgr6j1clm9	2026-02-22 17:00:00	2026-02-22 23:57:29.482	16.475190600000000000000000000000	99.553664800000010000000000000000	4zl33m	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:57:30.149	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyeqr5x000d6odtp8aovd6y	cml5waf57000114p7u4pb0j1l	2026-02-22 17:00:00	2026-02-22 23:57:30.265	16.475449700000000000000000000000	99.553880900000000000000000000000	vr2ul	GPS	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:57:32.037	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyc24yg0003dq9y6y7w3lbv	cml6ctveb000vuqrg3ulgugaj	2026-02-22 17:00:00	2026-02-22 22:42:23.573	16.455080300000000000000000000000	99.530119600000010000000000000000	-g2tc5p	QR	2026-02-23 05:49:24.014	16.455075800000000000000000000000	99.530164900000000000000000000000	f7k720	GPS	APPROVED	6.120000000000000000000000000000	0.000000000000000000000000000000	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 22:42:24.28	2026-02-23 05:49:24.892	\N	\N	0.000000000000000000000000000000	\N
cmlycpyon000b4e1duzkel8qq	cml6ctvja0013uqrgbdjr4l0e	2026-02-22 17:00:00	2026-02-22 23:00:55.219	16.455062700000000000000000000000	99.530161800000000000000000000000	-xk7lgp	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 23:00:55.895	2026-02-23 05:58:35.045	86	2026-02-23 05:58:33.923	0.000000000000000000000000000000	2026-02-23 04:32:13.967
cmlycj8da00074e1d7w8cdopt	cml5g1xzx001oua47iy5u23oh	2026-02-22 17:00:00	2026-02-22 22:55:40.992	16.475042900000000000000000000000	99.552966900000000000000000000000	c4n38v	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 22:55:41.854	2026-02-23 03:08:06.609	\N	\N	0.000000000000000000000000000000	2026-02-23 03:08:06.608
cmlycmfym00094e1dwyko5uae	cml6ctuzt0005uqrgdnihhrcg	2026-02-22 17:00:00	2026-02-22 22:58:10.992	16.436279900000000000000000000000	99.511921400000010000000000000000	-xuvpf5	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 22:58:11.662	2026-02-23 04:04:31.833	60	2026-02-23 04:04:31.206	0.000000000000000000000000000000	2026-02-23 03:03:36.715
cmlybkh0t0001dq9ya3kuh6r2	cml6ctvgi000zuqrguiuyi2de	2026-02-22 17:00:00	2026-02-22 22:28:39.4	16.455072700000000000000000000000	99.530146599999990000000000000000	-5m8uqd	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-22 22:28:40.11	2026-02-23 04:27:54.009	85	2026-02-23 04:27:53.128	0.000000000000000000000000000000	2026-02-23 03:02:28.722
cmlyf37e200073koo85gvnkrh	cml6ctvms0019uqrg4ft54y7j	2026-02-22 17:00:00	2026-02-23 00:07:12.254	16.454955000000000000000000000000	99.529864300000000000000000000000	-5m8uqd	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-23 00:07:12.938	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyf5w58000f6odtfr4snwav	cml6cv8qd000113l7pz55vip3	2026-02-22 17:00:00	2026-02-23 00:09:17.659	16.455067900000000000000000000000	99.530107700000000000000000000000	-xgf12i	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-23 00:09:18.332	2026-02-23 00:30:11.247	\N	\N	0.000000000000000000000000000000	\N
cmlyfycgx000b3koowg0trrop	cml6ctvrh001luqrg60imh1k9	2026-02-22 17:00:00	2026-02-23 00:31:24.074	16.475186700000000000000000000000	99.553668100000000000000000000000	-xuvpf5	GPS	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 00:31:25.857	2026-02-23 00:31:25.857	\N	\N	0.000000000000000000000000000000	\N
cmlyg5v8g000h6odtua45n7jv	cml6ctuyp0003uqrgejbtvcmm	2026-02-22 17:00:00	2026-02-23 00:37:16.099	16.436464800000000000000000000000	99.511883100000010000000000000000	ysf08w	QR	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 00:37:16.768	2026-02-23 00:37:16.768	\N	\N	0.000000000000000000000000000000	\N
cmlyg6eoy0001ip7fp7392ugf	cml6cv8w4000913l7imruilgz	2026-02-22 17:00:00	2026-02-23 00:37:41.127	16.475184300000000000000000000000	99.553638400000000000000000000000	-7x56ss	QR	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 00:37:41.986	2026-02-23 00:37:41.986	\N	\N	0.000000000000000000000000000000	\N
cmlygp2b70003ip7fzxw1l5kl	cml6ctvp6001fuqrgjo0cut8g	2026-02-22 17:00:00	2026-02-23 00:52:11.759	16.455080300000000000000000000000	99.530160100000000000000000000000	-ilt8ll	QR	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 00:52:12.403	2026-02-23 00:52:12.403	\N	\N	0.000000000000000000000000000000	\N
cmlvgg8ix0001g2807anrz0bp	cml6ctvwy001xuqrgl2hwd8y1	2026-02-20 17:00:00	2026-02-20 22:22:00.908	16.455057800000000000000000000000	99.530192900000000000000000000000	ymf41f	QR	2026-02-21 10:22:00.908	\N	\N	\N	\N	APPROVED	12.000000000000000000000000000000	\N	0	\N	0.000000000000000000000000000000	ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน 14 ชม.) อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-21 07:51:17.251	2026-02-20 22:22:02.025	2026-02-23 05:24:06.507	\N	\N	0.000000000000000000000000000000	\N
cmlyqer1500011013kwad33qn	cml6ctvwy001xuqrgl2hwd8y1	2026-02-22 17:00:00	2026-02-23 05:24:05.848	16.455079500000000000000000000000	99.530156300000000000000000000000	ymf41f	QR	\N	\N	\N	\N	\N	PENDING	\N	\N	414	\N	350.000000000000000000000000000000	\N	\N	\N	2026-02-23 05:24:07.385	2026-02-23 05:24:07.385	\N	\N	0.000000000000000000000000000000	\N
cmlyivf8u0005ip7ft9llqmta	cml5g20im0022ua4780xu5bou	2026-02-22 17:00:00	2026-02-23 01:53:07.199	16.475204000000000000000000000000	99.553659200000000000000000000000	-rrm7pw	GPS	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 01:53:08.334	2026-02-23 05:34:15.974	\N	\N	0.000000000000000000000000000000	2026-02-23 05:34:15.973
cmlyrbxeo000153ud0u921bfs	cml6ctvlp0017uqrgl43h68pm	2026-02-22 17:00:00	2026-02-23 05:49:54.845	16.455091500000000000000000000000	99.530117899999990000000000000000	-jkouny	QR	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 05:49:55.297	2026-02-23 05:49:55.297	\N	\N	0.000000000000000000000000000000	\N
cmlyrfw1y00015nf5a0vpxt1c	cml5cxygj0003v68ql9533bl3	2026-02-22 17:00:00	2026-02-23 05:52:59.713	16.475130600000000000000000000000	99.553605600000000000000000000000	ymf41f	QR	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 05:53:00.167	2026-02-23 05:53:00.167	\N	\N	0.000000000000000000000000000000	\N
cmlyrmrmg0001iyqe0lt1be3r	cml6ctvff000xuqrgvuiy6k2z	2026-02-22 17:00:00	2026-02-23 02:00:00	\N	\N	\N	MANUAL	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 05:58:21.016	2026-02-23 05:58:21.016	\N	\N	0.000000000000000000000000000000	\N
cmlyj4qpl0001k2pr6bqyxmpl	cml6ctvhm0011uqrgd2s6gv12	2026-02-22 17:00:00	2026-02-23 02:00:21.983	16.455107300000000000000000000000	99.530194100000000000000000000000	4uyosu	QR	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 02:00:23.097	2026-02-23 06:01:37.132	\N	\N	0.000000000000000000000000000000	2026-02-23 06:01:37.131
cmlyixrzj0007ip7fpq0gcl90	cml5g22hz002gua47temxhj1t	2026-02-22 17:00:00	2026-02-23 01:54:57.1	16.475297900000000000000000000000	99.553852600000000000000000000000	8dlb91	QR	\N	\N	\N	\N	\N	PENDING	\N	\N	0	\N	0.000000000000000000000000000000	\N	\N	\N	2026-02-23 01:54:58.159	2026-02-23 06:05:10.144	\N	\N	0.000000000000000000000000000000	2026-02-23 06:05:10.143
cmlyf5day00093koo7xll0qxi	cml6ctv0x0007uqrgprf5lu7c	2026-02-22 17:00:00	2026-02-23 00:08:53.233	16.436394860769710000000000000000	99.511782529298760000000000000000	-85vz5c	QR	\N	\N	\N	\N	\N	APPROVED	\N	\N	0	\N	0.000000000000000000000000000000	อนุมัติอัตโนมัติโดยระบบ	\N	2026-02-23 07:30:11.246	2026-02-23 00:08:53.914	2026-02-23 06:05:11.645	58	2026-02-23 06:05:10.964	0.000000000000000000000000000000	2026-02-23 05:06:41.164
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, action, entity, "entityId", details, "ipAddress", "userAgent", "userId", "createdAt") FROM stdin;
cmlkqf3dd0001p0nlalq2c2k1	UPDATE	Attendance	cmlkpwmju00013md0y7vgead4	{"employeeId":"EMP98FCD","employeeName":"สำเริง สีจันทร์สุก","date":"2026-02-13","changes":["เวลาเข้า: 2026-02-13T10:01:14.622Z → 2026-02-13T00:30:00.000Z"],"oldCheckInTime":"2026-02-13T10:01:14.622Z","oldCheckOutTime":"2026-02-13T10:02:16.763Z","newCheckInTime":"2026-02-13T00:30:00.000Z","newCheckOutTime":"2026-02-13T10:02:16.763Z"}	\N	\N	cml61rz7u000111dofdoy94sd	2026-02-13 10:15:36.913
cmlkqfimb0003p0nlgm0e6vmo	UPDATE	Attendance	cmlkptanf0001aw701vrm7mkk	{"employeeId":"EMPCED25","employeeName":"saw mar young","date":"2026-02-13","changes":["เวลาเข้า: 2026-02-13T09:58:39.488Z → 2026-02-13T00:30:00.000Z"],"oldCheckInTime":"2026-02-13T09:58:39.488Z","oldCheckOutTime":null,"newCheckInTime":"2026-02-13T00:30:00.000Z","newCheckOutTime":null}	\N	\N	cml61rz7u000111dofdoy94sd	2026-02-13 10:15:56.676
cmlmcbmob00019j5repj4pul0	UPDATE	Attendance	cmlk2nymi000310au1tefxp2f	{"employeeId":"EMP7342D","employeeName":"thein min","date":"2026-02-13","changes":["เวลาเข้า: 2026-02-12T23:10:38.598Z → 2026-02-13T11:10:00.000Z"],"oldCheckInTime":"2026-02-12T23:10:38.598Z","oldCheckOutTime":null,"newCheckInTime":"2026-02-13T11:10:00.000Z","newCheckOutTime":null}	\N	\N	cml61rz7u000111dofdoy94sd	2026-02-14 13:16:33.035
cmlvqptbk000hr6werw1u9jj8	CREATE	Attendance	cmlvqpryo000fr6weudravstf	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-04","changes":["เวลาเข้า: - → 2026-02-03T22:30:00.000Z"],"oldCheckInTime":null,"oldCheckOutTime":null,"newCheckInTime":"2026-02-03T22:30:00.000Z","newCheckOutTime":null}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:09:25.04
cmlvqtwjq000jv692f9wpt57l	UPDATE	Attendance	cmlvqpryo000fr6weudravstf	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-04","changes":["เวลาเข้า: 2026-02-03T22:30:00.000Z → 2026-02-03T22:30:00.000Z"],"oldCheckInTime":"2026-02-03T22:30:00.000Z","oldCheckOutTime":null,"newCheckInTime":"2026-02-03T22:30:00.000Z","newCheckOutTime":null}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:12:35.847
cmlvqzf0e000lr6we5camctpv	CREATE	Attendance	cmlvqzdmz000jr6we6eph4zjd	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-05","changes":["เวลาออก: - → 2026-02-05T10:30:00.000Z"],"oldCheckInTime":null,"oldCheckOutTime":null,"newCheckInTime":null,"newCheckOutTime":"2026-02-05T10:30:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:16:53.054
cmlvr06bq000nr6weq7tipa0q	UPDATE	Attendance	cmlvqzdmz000jr6we6eph4zjd	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-05","changes":["เวลาออก: 2026-02-05T10:30:00.000Z → 2026-02-05T10:30:00.000Z"],"oldCheckInTime":null,"oldCheckOutTime":"2026-02-05T10:30:00.000Z","newCheckInTime":null,"newCheckOutTime":"2026-02-05T10:30:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:17:28.454
cmlvr1wg5000lv6923s5vun9h	UPDATE	Attendance	cmlvqzdmz000jr6we6eph4zjd	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-05","changes":["เวลาเข้า: - → 2026-02-04T22:30:00.000Z"],"oldCheckInTime":null,"oldCheckOutTime":"2026-02-05T10:30:00.000Z","newCheckInTime":"2026-02-04T22:30:00.000Z","newCheckOutTime":"2026-02-05T10:30:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:18:48.965
cmlvr8ek7000nv692sc6oljnj	UPDATE	Attendance	cmla16m1j000378vd3d8szvv6	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-06","changes":["เวลาออก: 2026-02-06T10:33:09.994Z → 2026-02-06T14:00:00.000Z"],"oldCheckInTime":"2026-02-05T22:31:28.402Z","oldCheckOutTime":"2026-02-06T10:33:09.994Z","newCheckInTime":"2026-02-05T22:31:28.402Z","newCheckOutTime":"2026-02-06T14:00:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:23:52.376
cmlvr9n94000pr6we6vydrnnd	UPDATE	Attendance	cmlbq7xsf0001qafd5m0n8ttg	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-07","changes":["เวลาเข้า: 2026-02-07T03:00:06.865Z → 2026-02-06T22:30:00.000Z"],"oldCheckInTime":"2026-02-07T03:00:06.865Z","oldCheckOutTime":"2026-02-14T05:36:45.424Z","newCheckInTime":"2026-02-06T22:30:00.000Z","newCheckOutTime":"2026-02-14T05:36:45.424Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:24:50.071
cmlvra2tx000rr6wezbxvwr2v	UPDATE	Attendance	cmlbq7xsf0001qafd5m0n8ttg	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-07","changes":["เวลาออก: 2026-02-14T05:36:45.424Z → 2026-02-07T10:30:00.000Z"],"oldCheckInTime":"2026-02-06T22:30:00.000Z","oldCheckOutTime":"2026-02-14T05:36:45.424Z","newCheckInTime":"2026-02-06T22:30:00.000Z","newCheckOutTime":"2026-02-07T10:30:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:25:10.485
cmlvrbhl2000pv692sh29xvg0	UPDATE	Attendance	cmlcxw0ik00034aezlky08g70	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-08","changes":["เวลาเข้า: 2026-02-08T01:00:00.000Z → 2026-02-07T22:30:00.000Z"],"oldCheckInTime":"2026-02-08T01:00:00.000Z","oldCheckOutTime":"2026-02-08T10:31:17.236Z","newCheckInTime":"2026-02-07T22:30:00.000Z","newCheckOutTime":"2026-02-08T10:31:17.236Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:26:16.263
cmlvrcam7000tr6weplftfmz9	UPDATE	Attendance	cmlhg1s7t00011jce6cnb6whb	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-11","changes":["เวลาเข้า: 2026-02-11T03:02:00.595Z → 2026-02-10T22:30:00.000Z"],"oldCheckInTime":"2026-02-11T03:02:00.595Z","oldCheckOutTime":"2026-02-11T10:36:12.697Z","newCheckInTime":"2026-02-10T22:30:00.000Z","newCheckOutTime":"2026-02-11T10:36:12.697Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:26:53.888
cmlvrd80i000tv6921ksudm9r	CREATE	Attendance	cmlvrd6lq000rv692t3d8svv1	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-13","changes":["เวลาออก: - → 2026-02-13T14:00:00.000Z"],"oldCheckInTime":null,"oldCheckOutTime":null,"newCheckInTime":null,"newCheckOutTime":"2026-02-13T14:00:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:27:37.17
cmlvreasg000vr6we33qdmi2n	UPDATE	Attendance	cmllvxlzi0005qhxc9xe8sjy9	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-14","changes":["เวลาออก: 2026-02-15T00:26:58.111Z → 2026-02-14T14:00:00.000Z"],"oldCheckInTime":"2026-02-14T05:37:44.458Z","oldCheckOutTime":"2026-02-15T00:26:58.111Z","newCheckInTime":"2026-02-14T05:37:44.458Z","newCheckOutTime":"2026-02-14T14:00:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:28:27.425
cmlvrf5nw000vv6926v2q4mj6	UPDATE	Attendance	cmlornpig0001t2yk1ur7snns	{"employeeId":"EMPE7FB0","employeeName":"ณัชชา","date":"2026-02-16","changes":["เวลาเข้า: 2026-02-16T06:01:22.553Z → 2026-02-16T00:34:00.000Z"],"oldCheckInTime":"2026-02-16T06:01:22.553Z","oldCheckOutTime":"2026-02-16T12:31:21.802Z","newCheckInTime":"2026-02-16T00:34:00.000Z","newCheckOutTime":"2026-02-16T12:31:21.802Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:29:07.436
cmlvrz34o000hvsi30k0dj6ao	BULK_BACKFILL	Attendance	\N	{"totalEntries":8,"successCount":8,"failCount":0,"dateRange":"2026-02-14 - 2026-02-21"}	\N	\N	cml61rz7u000111dofdoy94sd	2026-02-21 03:44:37.272
cmlvwy7tf0023j6budjiu5wl4	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-16 - 2026-02-16"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:03:54.771
cmlvwyssg000p12vpxtxlyl15	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-17 - 2026-02-17"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:04:21.952
cmlvrz6av000bggqepyq3qsdp	UPDATE	Attendance	cmlvru2kv0005ggqetnksghpl	{"employeeId":"EMPB63BB","employeeName":"นิตยา สอนคำ","date":"2026-01-28","changes":["เวลาเข้า: 2026-01-27T22:30:00.000Z → 2026-01-27T22:30:00.000Z"],"oldCheckInTime":"2026-01-27T22:30:00.000Z","oldCheckOutTime":"2026-01-28T10:30:00.000Z","newCheckInTime":"2026-01-27T22:30:00.000Z","newCheckOutTime":"2026-01-28T10:30:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:44:41.383
cmlvs0rqz0007ur210otr7alb	UPDATE	Attendance	cmlvryape0009ggqexz91a59o	{"employeeId":"EMPB63BB","employeeName":"นิตยา สอนคำ","date":"2026-02-01","changes":["เวลาออก: 2026-02-01T10:30:00.000Z → -"],"oldCheckInTime":"2026-01-31T22:30:00.000Z","oldCheckOutTime":"2026-02-01T10:30:00.000Z","newCheckInTime":"2026-01-31T22:30:00.000Z","newCheckOutTime":null}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:45:55.836
cmlvs17ef000dggqeh6kpivj8	UPDATE	Attendance	cmlvryape0009ggqexz91a59o	{"employeeId":"EMPB63BB","employeeName":"นิตยา สอนคำ","date":"2026-02-01","changes":["เวลาออก: - → 2026-02-01T10:35:00.000Z"],"oldCheckInTime":"2026-01-31T22:30:00.000Z","oldCheckOutTime":null,"newCheckInTime":"2026-01-31T22:30:00.000Z","newCheckOutTime":"2026-02-01T10:35:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:46:16.119
cmlvs3kvi000dur217put7ld4	UPDATE	Attendance	cmlvs1w700009ur21s6fmyyqv	{"employeeId":"EMPB63BB","employeeName":"นิตยา สอนคำ","date":"2026-02-02","changes":["เวลาออก: - → 2026-02-02T14:00:00.000Z"],"oldCheckInTime":"2026-02-02T02:00:00.000Z","oldCheckOutTime":null,"newCheckInTime":"2026-02-02T02:00:00.000Z","newCheckOutTime":"2026-02-02T14:00:00.000Z"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 03:48:06.894
cmlvt5x0q000t1kbpcj7837az	BULK_BACKFILL	Attendance	\N	{"totalEntries":13,"successCount":13,"failCount":0,"dateRange":"2026-01-26 - 2026-02-07"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 04:17:55.563
cmlvtj8yw000lez6lkzia69oy	BULK_BACKFILL	Attendance	\N	{"totalEntries":10,"successCount":10,"failCount":0,"dateRange":"2026-01-26 - 2026-02-05"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 04:28:17.576
cmlvtsrhj000v9q917en0hl7o	BULK_BACKFILL	Attendance	\N	{"totalEntries":9,"successCount":9,"failCount":0,"dateRange":"2026-01-26 - 2026-02-04"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 04:35:41.48
cmlvtstau00179q91freri8lh	BULK_BACKFILL	Attendance	\N	{"totalEntries":11,"successCount":11,"failCount":0,"dateRange":"2026-01-26 - 2026-02-05"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 04:35:43.831
cmlvtziuc000ls33yz3w038z6	BULK_BACKFILL	Attendance	\N	{"totalEntries":10,"successCount":10,"failCount":0,"dateRange":"2026-01-26 - 2026-02-05"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 04:40:56.868
cmlvu4bpe000f1cocedexivg0	BULK_BACKFILL	Attendance	\N	{"totalEntries":6,"successCount":6,"failCount":0,"dateRange":"2026-02-01 - 2026-02-14"}	\N	\N	cml6cv8qd000113l7pz55vip3	2026-02-21 04:44:40.898
cmlvu4eoz000p1coc4v9o8ax5	BULK_BACKFILL	Attendance	\N	{"totalEntries":4,"successCount":4,"failCount":0,"dateRange":"2026-01-26 - 2026-01-29"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 04:44:44.771
cmlvuankv00171cocaw1qm3n5	BULK_BACKFILL	Attendance	\N	{"totalEntries":8,"successCount":8,"failCount":0,"dateRange":"2026-02-01 - 2026-02-15"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 04:49:36.224
cmlvubdxs001b9q91e26nd08x	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-18 - 2026-02-18"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 04:50:10.384
cmlvuc61j0005uq6prj9pqyci	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-16 - 2026-02-16"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 04:50:46.807
cmlvuhkpk001v9q91104m5oap	BULK_BACKFILL	Attendance	\N	{"totalEntries":8,"successCount":8,"failCount":0,"dateRange":"2026-01-26 - 2026-02-04"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 04:54:59.097
cmlvunaid0017s33y2uaybp85	BULK_BACKFILL	Attendance	\N	{"totalEntries":10,"successCount":10,"failCount":0,"dateRange":"2026-01-26 - 2026-02-14"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 04:59:25.814
cmlvuuvg9002x9q91n3oaglj5	BULK_BACKFILL	Attendance	\N	{"totalEntries":13,"successCount":13,"failCount":0,"dateRange":"2026-01-26 - 2026-02-15"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 05:05:19.545
cmlvuywks003d9q913nhbg2j7	BULK_BACKFILL	Attendance	\N	{"totalEntries":7,"successCount":7,"failCount":0,"dateRange":"2026-02-01 - 2026-02-14"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 05:08:27.629
cmlvvgumq0015sddlmyznl1sa	BULK_BACKFILL	Attendance	\N	{"totalEntries":20,"successCount":20,"failCount":0,"dateRange":"2026-02-01 - 2026-02-20"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 05:22:24.915
cmlvvh42h0019sddlv51lc28i	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-21 - 2026-02-21"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 05:22:37.146
cmlvvhjtn001dsddl70poxt8p	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-11 - 2026-02-11"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 05:22:57.564
cmlvvnozy000nj6bu55b2wwu1	BULK_BACKFILL	Attendance	\N	{"totalEntries":11,"successCount":11,"failCount":0,"dateRange":"2026-02-05 - 2026-02-20"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 05:27:44.206
cmlvwqtlq000d12vp8h0t0wqq	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-01 - 2026-02-01"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 05:58:09.758
cmlvwt3nu0015j6bu3ptkk71v	BULK_BACKFILL	Attendance	\N	{"totalEntries":3,"successCount":3,"failCount":0,"dateRange":"2026-02-01 - 2026-02-04"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 05:59:56.107
cmlvwuk20001bj6buirrq575b	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-07 - 2026-02-07"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:01:04.009
cmlvwv6l6000h12vp4u4lf7kb	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-12 - 2026-02-12"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:01:33.211
cmlvww2ye000l12vpt64sqqh0	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-14 - 2026-02-14"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:02:15.159
cmlvwwflo001fj6buifl4v9z1	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-15 - 2026-02-15"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:02:31.549
cmlvwwr83001jj6bueubxv32o	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-16 - 2026-02-16"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:02:46.611
cmlvwx0ps001nj6buq19nf4k8	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-15 - 2026-02-15"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:02:58.913
cmlvwxdll001rj6busn5fd0dn	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-15 - 2026-02-15"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:03:15.61
cmlvwxqv3001vj6bu8pzluj9f	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-15 - 2026-02-15"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:03:32.799
cmlvwxxsp001zj6buchbr5cdg	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-15 - 2026-02-15"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:03:41.786
cmlvwzgmr0029j6bubo592x6v	BULK_BACKFILL	Attendance	\N	{"totalEntries":2,"successCount":2,"failCount":0,"dateRange":"2026-02-18 - 2026-02-19"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:04:52.851
cmlvwzqwg002dj6bugq5tgakb	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-20 - 2026-02-20"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:05:06.161
cmlw3v2os0005urp8s55ggwou	CREATE	DailyPayrollOverride	cmlw3v2bh0003urp8pq6j4ogt	{"employeeId":"FY20CC2","employeeName":"จิรวัฒน์","date":"2026-02-05","changes":["หักสาย: auto → 50"],"oldDailyWage":null,"oldOT":null,"newDailyWage":null,"newOT":null}	\N	\N	cml61rz7u000111dofdoy94sd	2026-02-21 09:17:25.469
cmlw3v5mi0009urp85e2bofs8	CREATE	DailyPayrollOverride	cmlw3v59e0007urp8hkanyrkw	{"employeeId":"FY20CC2","employeeName":"จิรวัฒน์","date":"2026-02-06","changes":["ปรับเงิน: 0 → 0"],"oldDailyWage":null,"oldOT":null,"newDailyWage":null,"newOT":null}	\N	\N	cml61rz7u000111dofdoy94sd	2026-02-21 09:17:29.274
cmlwwnfnz000564jpso4kocqx	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 54m, Allowed: 50m. Lat/Lng: 16.454775912133925,99.53037873633846	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-21 22:43:17.903
cmlwwnn2b000764jpn509qqv8	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 54m, Allowed: 50m. Lat/Lng: 16.454775586339718,99.53037841387258	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-21 22:43:27.491
cmlwwo08o000964jp4xiifqcb	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 54m, Allowed: 50m. Lat/Lng: 16.45477653717128,99.53037769532922	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-21 22:43:44.568
cmlx37yb00007spye1kk4wns0	BULK_BACKFILL	Attendance	\N	{"totalEntries":3,"successCount":3,"failCount":0,"dateRange":"2026-01-26 - 2026-01-28"}	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 01:47:12.877
cmlx46qet000fvbcxf8ky5l6i	BULK_BACKFILL	Attendance	\N	{"totalEntries":5,"successCount":5,"failCount":0,"dateRange":"2026-01-29 - 2026-02-04"}	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 02:14:15.606
cmlx6buke0003cjj7azdpexza	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-05 - 2026-02-05"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:14:13.502
cmlx6gjgh0007cjj79jzhqi8y	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-10 - 2026-02-10"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:17:52.385
cmlx6h1du000bcjj7muo0mmct	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-11 - 2026-02-11"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:18:15.618
cmlx6j2580003qi9ucaudt29l	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-14 - 2026-02-14"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:19:48.638
cmlx6kahr0007qi9uln5mjef8	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-17 - 2026-02-17"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:20:47.391
cmlx6mogr000fcjj7qetrnw9x	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-19 - 2026-02-19"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:22:38.812
cmlx6pmio000jspye21yu37rp	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-04 - 2026-02-04"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:24:56.257
cmlx6q1yd000nspyeuq53jwvm	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-04 - 2026-02-04"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:25:16.261
cmlx6yp7w000rspyery0uomww	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-01 - 2026-02-01"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:31:59.661
cmlx70f6x004rqi9uomvs68i5	BULK_BACKFILL	Attendance	\N	{"totalEntries":81,"successCount":81,"failCount":0,"dateRange":"2026-01-26 - 2026-02-04"}	\N	\N	cml5w8h240001ugxaadqh8irg	2026-02-22 03:33:19.978
cmlx77nvi001ncjj72hut7d8w	BULK_BACKFILL	Attendance	\N	{"totalEntries":20,"successCount":20,"failCount":0,"dateRange":"2026-02-02 - 2026-02-21"}	\N	\N	cml6ctv7w000juqrgh1tdiejn	2026-02-22 03:38:57.822
cmlxcnv4f0003xtol14645d3x	BULK_BACKFILL	Attendance	\N	{"totalEntries":1,"successCount":1,"failCount":0,"dateRange":"2026-02-21 - 2026-02-21"}	\N	\N	cml6ctvwy001xuqrgl2hwd8y1	2026-02-22 06:11:31.792
cmlyc3p0n0005dq9yrvd24nis	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347541375,99.53037602940233	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:43:36.936
cmlyc3tv40007dq9ytkt54vn3	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347541375,99.53037602940235	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:43:43.216
cmlyc3y4c0009dq9ys1qxw9ah	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.45478934754137,99.53037602940233	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:43:48.732
cmlyc4dse000bdq9yftx0np8b	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347541375,99.53037602940233	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:44:09.038
cmlyc4wq3000ddq9ye95oom73	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347541375,99.53037602940233	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:44:33.58
cmlyc5281000fdq9yq5fzbuvp	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347563317,99.53037602939676	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:44:40.705
cmlyc5lfk000hdq9yjfwulgv5	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347541375,99.53037602940236	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:45:05.6
cmlyc6ery00014e1dhg7c33pe	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347541375,99.53037602940233	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:45:43.631
cmlyc6m6100034e1d9cwk8fqs	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347541375,99.53037602940233	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:45:53.21
cmlyc6zxm00054e1d8ahv1tp0	CHECK_IN_FAILED	Attendance	\N	Location invalid. Distance: 52m, Allowed: 50m. Lat/Lng: 16.454789347541375,99.53037602940232	\N	\N	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 22:46:11.05
\.


--
-- Data for Name: Authenticator; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Authenticator" ("credentialID", "userId", "providerAccountId", "credentialPublicKey", counter, "credentialDeviceType", "credentialBackedUp", transports) FROM stdin;
\.


--
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Comment" (id, content, "postId", "authorId", "createdAt") FROM stdin;
\.


--
-- Data for Name: DailyPayrollOverride; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DailyPayrollOverride" (id, "userId", date, "overrideDailyWage", "overrideOT", note, "createdAt", "updatedAt", adjustment, "overrideLatePenalty") FROM stdin;
cmlw3v2bh0003urp8pq6j4ogt	cml5g289u003uua47ulssk26x	2026-02-05 00:00:00	\N	\N	\N	2026-02-21 09:17:24.99	2026-02-21 09:17:24.99	0.000000000000000000000000000000	50.000000000000000000000000000000
cmlw3v59e0007urp8hkanyrkw	cml5g289u003uua47ulssk26x	2026-02-06 00:00:00	\N	\N	\N	2026-02-21 09:17:28.803	2026-02-21 09:17:28.803	0.000000000000000000000000000000	\N
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Department" (id, name, code, "stationId", "isFrontYard", "weeklyDayOff", "sundayEndTime", "createdAt", "updatedAt") FROM stdin;
cml5bya6x000h14m6lysk7qbh	หน้าลาน	FUEL	cml5by818000014m683rzadum	f	\N	\N	2026-02-03 04:16:58.802	2026-02-03 04:16:58.802
cml5byaaj000j14m6lxzgng16	เสมียน	CLERK	cml5by818000014m683rzadum	f	\N	\N	2026-02-03 04:16:58.9	2026-02-03 04:16:58.9
cml5byadq000l14m6nbtshtco	ร้านกาแฟ	CAFE	cml5by818000014m683rzadum	f	\N	\N	2026-02-03 04:16:58.951	2026-02-03 04:16:58.951
cml5byaga000n14m6f7mxdl6d	บ่อถ่ายน้ำมัน	OIL_PIT	cml5by818000014m683rzadum	f	\N	\N	2026-02-03 04:16:58.999	2026-02-03 04:16:58.999
cml5byalg000p14m6f61bwm82	แม่บ้าน	MAID	cml5by818000014m683rzadum	f	\N	\N	2026-02-03 04:16:59.045	2026-02-03 04:16:59.045
cml5byan4000r14m6brmmru3m	จิปาถะ	MISC	cml5by818000014m683rzadum	f	\N	\N	2026-02-03 04:16:59.096	2026-02-03 04:16:59.096
cml5byaor000t14m6ik3csf83	หน้าลาน	FUEL	cml5by908000114m6el6np1dp	f	\N	\N	2026-02-03 04:16:59.146	2026-02-03 04:16:59.146
cml5byaqg000v14m6yck5lb4i	แก๊ส	GAS	cml5by908000114m6el6np1dp	f	\N	\N	2026-02-03 04:16:59.193	2026-02-03 04:16:59.193
cml5byas8000x14m66o2b3vd3	เสมียน	CLERK	cml5by908000114m6el6np1dp	f	\N	\N	2026-02-03 04:16:59.241	2026-02-03 04:16:59.241
cml5byatw000z14m60a0nrjoz	ร้านกาแฟ	CAFE	cml5by908000114m6el6np1dp	f	\N	\N	2026-02-03 04:16:59.293	2026-02-03 04:16:59.293
cml5byaxw001114m65wcpjck4	ล้างรถ	CAR_WASH	cml5by908000114m6el6np1dp	f	\N	\N	2026-02-03 04:16:59.344	2026-02-03 04:16:59.344
cml5byazl001314m6ash3c3u0	แม่บ้าน	MAID	cml5by908000114m6el6np1dp	f	\N	\N	2026-02-03 04:16:59.391	2026-02-03 04:16:59.391
cml5byb2h001514m6oezn2e06	หน้าลาน	FUEL	cml5by92t000214m6ta5q3o28	f	\N	\N	2026-02-03 04:16:59.441	2026-02-03 04:16:59.441
cml5byb4f001714m6fozklfm3	เสมียน	CLERK	cml5by92t000214m6ta5q3o28	f	\N	\N	2026-02-03 04:16:59.504	2026-02-03 04:16:59.504
cml5byb6k001914m6zzl1yjdo	แก๊ส	GAS	cml5by92t000214m6ta5q3o28	f	\N	\N	2026-02-03 04:16:59.561	2026-02-03 04:16:59.561
cml5byb8t001b14m61yx8ar7q	ร้านกาแฟ	CAFE	cml5by92t000214m6ta5q3o28	f	\N	\N	2026-02-03 04:16:59.612	2026-02-03 04:16:59.612
cml5bybav001d14m6edtplh6i	แม่บ้าน	MAID	cml5by92t000214m6ta5q3o28	f	\N	\N	2026-02-03 04:16:59.659	2026-02-03 04:16:59.659
cml5g1o4u0002ua47camd41dk	หน้าลาน	FRONTYARD	cml5by818000014m683rzadum	f	\N	\N	2026-02-03 04:16:59.71	2026-02-03 04:16:59.71
\.


--
-- Data for Name: DepartmentShift; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DepartmentShift" (id, "departmentId", "shiftId") FROM stdin;
cml7q81bq0002w66je77g9dh8	cml5byadq000l14m6nbtshtco	cml7q816x0000w66jefyem7i4
cml7q81lk0004w66jwtex5cjt	cml5byatw000z14m60a0nrjoz	cml7q816x0000w66jefyem7i4
cml7q81rg0006w66j2exkk0x6	cml5byb8t001b14m61yx8ar7q	cml7q816x0000w66jefyem7i4
cml8xjw4l0002lmhqhwxh7pa6	cml5byaga000n14m6f7mxdl6d	cml8xjvvq0000lmhqlfjxjjjz
cml8xjw4l0003lmhqho3nf2td	cml5byaga000n14m6f7mxdl6d	cml8xjvyd0001lmhqft4j1vq2
\.


--
-- Data for Name: EmployeeAvailability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeAvailability" (id, "userId", date, status, note, "createdAt", "updatedAt") FROM stdin;
cml7s4q3q0000yvbf74hbd0rc	cml5g1xzx001oua47iy5u23oh	2026-02-05 00:00:00	AVAILABLE	\N	2026-02-04 08:42:32.102	2026-02-04 08:42:32.102
cml9armuz0008dfaey8v8gvvc	cml6cv8qd000113l7pz55vip3	2026-02-21 00:00:00	UNAVAILABLE	\N	2026-02-05 10:12:00.252	2026-02-05 10:12:02.782
\.


--
-- Data for Name: HappinessLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HappinessLog" (id, "userId", date, mood, note, "createdAt") FROM stdin;
cmlkqwwnf0001r7tt9ko6lh8b	cml6cv8qd000113l7pz55vip3	2026-02-13 10:29:28.012	HAPPY		2026-02-13 10:29:28.012
cmlkr1lwv0005p0nl3o7k6s54	cml5g1qzg000iua472zcpgugd	2026-02-13 10:33:07.375	HAPPY		2026-02-13 10:33:07.375
cmlkr354t0007p0nlf209uxt5	cml6ctvgi000zuqrguiuyi2de	2026-02-13 10:34:18.941	HAPPY		2026-02-13 10:34:18.941
cmlks82990009p0nlzk6i9ouo	cml6ctuzt0005uqrgdnihhrcg	2026-02-13 11:06:07.898	HAPPY		2026-02-13 11:06:07.898
cmlksbdr10001x23lroqcme3y	cml6ctvja0013uqrgbdjr4l0e	2026-02-13 11:08:42.974	HAPPY		2026-02-13 11:08:42.974
cmlkse04d0003x23lu4hwa3ga	cml6ctv3c000buqrguslcci85	2026-02-13 11:10:45.046	HAPPY		2026-02-13 11:10:45.046
cmlku90su00011krvsol0rsxq	cml6ctvms0019uqrg4ft54y7j	2026-02-13 12:02:52.111	HAPPY		2026-02-13 12:02:52.111
cmlkuaekv0001d7uiw4r67135	cml6ctvms0019uqrg4ft54y7j	2026-02-13 12:03:56.624	HAPPY		2026-02-13 12:03:56.624
cmlkud49b0003d7uiljpescw1	cml6ctv0x0007uqrgprf5lu7c	2026-02-13 12:06:03.215	HAPPY		2026-02-13 12:06:03.215
cmlkuyg6f0001s7xrxzeo34jo	cml6ctvnx001buqrgfzjexn6r	2026-02-13 12:22:38.44	HAPPY		2026-02-13 12:22:38.44
cmlkwciqn0001g9fplqsobxop	cml5g289u003uua47ulssk26x	2026-02-13 13:01:34.348	HAPPY		2026-02-13 13:01:34.348
cmlkyf38z000167ubrvqgw09s	cml6ctvhm0011uqrgd2s6gv12	2026-02-13 13:59:33.47	HAPPY		2026-02-13 13:59:33.47
cmlkyi51b000367ubf69fwzbw	cml6ctvlp0017uqrgl43h68pm	2026-02-13 14:01:55.755	HAPPY		2026-02-13 14:01:55.755
cmlkyiq28000567ubp32eankj	cml5g22hz002gua47temxhj1t	2026-02-13 14:02:23.004	HAPPY		2026-02-13 14:02:23.004
cmll0j4or000110t4sjwng553	cml5cxygj0003v68ql9533bl3	2026-02-13 14:58:41.186	HAPPY		2026-02-13 14:58:41.186
cmll1gxaf000112lqhqg1lqdy	cml6ctv6r000huqrg08xd4xcm	2026-02-13 15:24:57.91	HAPPY		2026-02-13 15:24:57.91
cmllhki1i00013r6qdyhwuh0t	cml6ctvnx001buqrgfzjexn6r	2026-02-13 22:55:38.63	HAPPY		2026-02-13 22:55:38.63
cmllhpyi0000310b3uudeit1s	cml5w8h240001ugxaadqh8irg	2026-02-13 22:59:53.448	NEUTRAL		2026-02-13 22:59:53.448
cmllhu5ch00093r6qic3z0urm	cml6ctvja0013uqrgbdjr4l0e	2026-02-13 23:03:08.731	HAPPY		2026-02-13 23:03:08.731
cmllhucxb000b3r6qinwlaoza	cml6ctvja0013uqrgbdjr4l0e	2026-02-13 23:03:18.768	HAPPY		2026-02-13 23:03:18.768
cmllhvt6o000f3r6qdud42zbi	cml6ctv6r000huqrg08xd4xcm	2026-02-13 23:04:26.282	HAPPY		2026-02-13 23:04:26.282
cmlljhhd600011111zra0rbes	cml6ctvms0019uqrg4ft54y7j	2026-02-13 23:49:17.014	HAPPY		2026-02-13 23:49:17.014
cmlljv39200051111piwhdjw5	cml6ctvsk001nuqrgooayfxde	2026-02-13 23:59:51.893	HAPPY		2026-02-13 23:59:51.893
cmlljvn9h000711115yitfgoa	cml6ctvsk001nuqrgooayfxde	2026-02-14 00:00:16.754	HAPPY		2026-02-14 00:00:16.754
cmlllubkv00015nbxfi88hrmi	cml6ctvp6001fuqrgjo0cut8g	2026-02-14 00:55:15.275	HAPPY		2026-02-14 00:55:15.275
cmlluyixf0001wr0jd81g3ai8	cml6ctuzt0005uqrgdnihhrcg	2026-02-14 05:10:27.972	HAPPY		2026-02-14 05:10:27.972
cmllvlnpk0003wr0jcnn35wxv	cml6ctvqa001huqrgn8fa8qe5	2026-02-14 05:28:27.464	HAPPY		2026-02-14 05:28:27.464
cmllvwyid0001qhxcvifcooki	cml6ctvwy001xuqrgl2hwd8y1	2026-02-14 05:37:14.678	HAPPY		2026-02-14 05:37:14.678
cmllvx7vr0003qhxc8vo1u8ed	cml6ctvwy001xuqrgl2hwd8y1	2026-02-14 05:37:26.61	HAPPY		2026-02-14 05:37:26.61
cmllvy9710007qhxcvk4n4o6p	cml6ctvcw000tuqrgj8clzpzz	2026-02-14 05:38:14.968	HAPPY		2026-02-14 05:38:14.968
cmllwbat40009qhxcvndb9d5j	cml6ctv7w000juqrgh1tdiejn	2026-02-14 05:48:23.801	HAPPY		2026-02-14 05:48:23.801
cmllykjoq000bqhxcr5fj037y	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:51:34.228	HAPPY		2026-02-14 06:51:34.228
cmllyksqg000dqhxcjxl9wms3	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:51:46.168	HAPPY		2026-02-14 06:51:46.168
cmllykxst000fqhxckwyo3ln1	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:51:52.519	HAPPY		2026-02-14 06:51:52.519
cmllyl5mn000hqhxc1tcwh2dt	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:52:02.88	HAPPY		2026-02-14 06:52:02.88
cmllyl8v2000jqhxcdupq9elx	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:52:07.071	HAPPY		2026-02-14 06:52:07.071
cmllyld72000lqhxclmif70mq	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:52:12.686	HAPPY		2026-02-14 06:52:12.686
cmllylgpa000nqhxcoywg6ir8	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:52:17.23	HAPPY		2026-02-14 06:52:17.23
cmllyljyk000pqhxc7q0pt8av	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:52:21.452	HAPPY		2026-02-14 06:52:21.452
cmllylnm3000rqhxclha2s3s3	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:52:25.972	HAPPY		2026-02-14 06:52:25.972
cmllylqo2000tqhxcc8mtxdpc	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:52:30.146	HAPPY		2026-02-14 06:52:30.146
cmllylu91000vqhxcdcsi5c7b	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:52:34.79	HAPPY		2026-02-14 06:52:34.79
cmllyn4kx0001hc83jjjt54zh	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:53:34.619	HAPPY		2026-02-14 06:53:34.619
cmllynaej0003hc83e0qsehk6	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:53:42.379	HAPPY		2026-02-14 06:53:42.379
cmllynfyp0005hc83mx8dkpyj	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:53:49.585	HAPPY		2026-02-14 06:53:49.585
cmllynol10007hc83laqbzrxx	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:54:00.757	HAPPY		2026-02-14 06:54:00.757
cmllynrg50009hc837dlifzxt	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:54:04.469	HAPPY		2026-02-14 06:54:04.469
cmllyo482000bhc8394fvjekd	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:54:21.026	HAPPY		2026-02-14 06:54:21.026
cmllypeu5000xqhxcgcb98roo	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:55:21.437	HAPPY		2026-02-14 06:55:21.437
cmllyps0c000zqhxczki2a2kh	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:55:38.508	HAPPY		2026-02-14 06:55:38.508
cmllypyhd0011qhxcob9c98bm	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:55:46.681	HAPPY		2026-02-14 06:55:46.681
cmllyq1tj0013qhxc12eqe4jm	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:55:51.223	HAPPY		2026-02-14 06:55:51.223
cmllyq5hr0015qhxcvfgyhw3t	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:55:55.983	HAPPY		2026-02-14 06:55:55.983
cmllyqhcr0017qhxc5t0wbmou	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:56:11.355	HAPPY		2026-02-14 06:56:11.355
cmllyqn200019qhxcozsm0kr0	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:56:18.744	HAPPY		2026-02-14 06:56:18.744
cmllyqrww001bqhxcp9ldz4iu	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 06:56:24.832	HAPPY		2026-02-14 06:56:24.832
cmllz9lze001dqhxc80r7hi5x	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 07:11:03.603	HAPPY		2026-02-14 07:11:03.603
cmllz9s65000dhc831yqc4irv	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 07:11:11.837	HAPPY		2026-02-14 07:11:11.837
cmllza3uk000fhc83d4j1kz1n	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 07:11:26.761	HAPPY		2026-02-14 07:11:26.761
cmllzajnu000hhc83r52ccg51	cml6ctvkk0015uqrg9iuy6dh1	2026-02-14 07:11:47.255	HAPPY		2026-02-14 07:11:47.255
cmlm4rcf00001ywaahpehlsp1	cml6ctv6r000huqrg08xd4xcm	2026-02-14 09:44:49.308	HAPPY		2026-02-14 09:44:49.308
cmlm55uub00016yk2lqgb43ap	cml5waf57000114p7u4pb0j1l	2026-02-14 09:56:06.372	HAPPY		2026-02-14 09:56:06.372
cmlm560hw00036yk2z7cnl6zp	cml6ctvtp001puqrgr6j1clm9	2026-02-14 09:56:13.701	HAPPY		2026-02-14 09:56:13.701
cmlm5d0ne00056yk24p789x7o	cml6cv8sm000313l7yhueq5zy	2026-02-14 10:01:40.491	HAPPY		2026-02-14 10:01:40.491
cmlm5d3wd00076yk2pl96g9vr	cml6ctuwf0001uqrgn7ktp9je	2026-02-14 10:01:44.488	HAPPY		2026-02-14 10:01:44.488
cmlm5df5k00096yk27wp5qe6f	cml6cv8sm000313l7yhueq5zy	2026-02-14 10:01:59.289	NEUTRAL		2026-02-14 10:01:59.289
cmlm5dv0y000b6yk2fpnuk40r	cml6cv8w4000913l7imruilgz	2026-02-14 10:02:19.645	HAPPY		2026-02-14 10:02:19.645
cmlm5e61d0003ywaap0qnqi0w	cml6cv8w4000913l7imruilgz	2026-02-14 10:02:34.129	HAPPY		2026-02-14 10:02:34.129
cmlm5fo7b0005ywaaoc77j30g	cml6ctvp6001fuqrgjo0cut8g	2026-02-14 10:03:44.116	HAPPY		2026-02-14 10:03:44.116
cmlm5g8uh0007ywaahd4q89ou	cml6cv8uy000713l7zocqn0fn	2026-02-14 10:04:10.87	HAPPY		2026-02-14 10:04:10.87
cmlm5gedz0009ywaay27z78df	cml6ctvp6001fuqrgjo0cut8g	2026-02-14 10:04:16.957	HAPPY		2026-02-14 10:04:16.957
cmlm5gzec000bywaaypq265vh	cml6ctvp6001fuqrgjo0cut8g	2026-02-14 10:04:45.278	HAPPY		2026-02-14 10:04:45.278
cmlm5hd9r000dywaatmrttyjf	cml6ctvp6001fuqrgjo0cut8g	2026-02-14 10:05:03.256	HAPPY		2026-02-14 10:05:03.256
cmlm5hn97000fywaa1u69bzsj	cml6ctvp6001fuqrgjo0cut8g	2026-02-14 10:05:16.412	HAPPY		2026-02-14 10:05:16.412
cmlm5hvoz000hywaaqzyj9dd0	cml6ctvp6001fuqrgjo0cut8g	2026-02-14 10:05:27.348	HAPPY		2026-02-14 10:05:27.348
cmlm5m66a000jywaav0gn2r58	cml6cv8ts000513l7uydg8j16	2026-02-14 10:08:47.555	HAPPY		2026-02-14 10:08:47.555
cmlm6ctzf0001114265ycq9x9	cml6ctvrh001luqrg60imh1k9	2026-02-14 10:29:31.246	HAPPY		2026-02-14 10:29:31.246
cmlm6e2cf000111etlag2635u	cml5g20im0022ua4780xu5bou	2026-02-14 10:30:28.959	NEUTRAL		2026-02-14 10:30:28.959
cmlm6g3hi000311etck72pn5r	cml6cv8qd000113l7pz55vip3	2026-02-14 10:32:03.536	HAPPY		2026-02-14 10:32:03.536
cmlm6i7cu00031142f7g52d5o	cml6ctvgi000zuqrguiuyi2de	2026-02-14 10:33:41.862	HAPPY		2026-02-14 10:33:41.862
cmlm6iix000051142kx8fp36z	cml6ctvgi000zuqrguiuyi2de	2026-02-14 10:33:57.06	HAPPY		2026-02-14 10:33:57.06
cmlm7ta2z0001mdlzy3gen99b	cml6ctvja0013uqrgbdjr4l0e	2026-02-14 11:10:18.229	HAPPY		2026-02-14 11:10:18.229
cmlm7tmy70003mdlzq9o4rov1	cml6ctvja0013uqrgbdjr4l0e	2026-02-14 11:10:34.905	HAPPY		2026-02-14 11:10:34.905
cmlm7wssw0005mdlz6zldxa9a	cml6ctv3c000buqrguslcci85	2026-02-14 11:13:02.462	HAPPY		2026-02-14 11:13:02.462
cmlm8jxp30001a8ew3lk6kiae	cml5g1xzx001oua47iy5u23oh	2026-02-14 11:31:02.104	NEUTRAL		2026-02-14 11:31:02.104
cmlm9lxy3000149krzi83q3pq	cml6ctvms0019uqrg4ft54y7j	2026-02-14 12:00:35.351	HAPPY		2026-02-14 12:00:35.351
cmlm9zrxj0001ul5gsvldciya	cml6ctv0x0007uqrgprf5lu7c	2026-02-14 12:11:20.53	HAPPY		2026-02-14 12:11:20.53
cmlmard830001gkigw74l27k0	cml6ctuyp0003uqrgejbtvcmm	2026-02-14 12:32:47.842	NEUTRAL		2026-02-14 12:32:47.842
cmlmbw08r0001jfht3uv6o4ns	cml6ctvnx001buqrgfzjexn6r	2026-02-14 13:04:24.124	HAPPY		2026-02-14 13:04:24.124
cmlmdvlgt000157a8ei8mvxy0	cml6ctvhm0011uqrgd2s6gv12	2026-02-14 14:00:03.981	HAPPY		2026-02-14 14:00:03.981
cmlmdx2fp000357a8iwbsf1f2	cml6ctvlp0017uqrgl43h68pm	2026-02-14 14:01:12.853	HAPPY		2026-02-14 14:01:12.853
cmlmdxcu40001e5arb99b15bq	cml6ctvlp0017uqrgl43h68pm	2026-02-14 14:01:24.96	HAPPY		2026-02-14 14:01:24.96
cmlmkbhhd000111ptmnk5uv4t	cml6ctva5000nuqrg8wh05sro	2026-02-14 17:00:23.003	HAPPY		2026-02-14 17:00:23.003
cmlmwvynu0007v1y1lt1ii6ms	cml5g1xzx001oua47iy5u23oh	2026-02-14 22:52:14.011	NEUTRAL		2026-02-14 22:52:14.011
cmlmx6j2e0005dd6xhs3n7m0y	cml5w8h240001ugxaadqh8irg	2026-02-14 23:00:26.8	NEUTRAL		2026-02-14 23:00:26.8
cmlmx717n0007dd6xcj5ymwt8	cml5w8h240001ugxaadqh8irg	2026-02-14 23:00:50.318	NEUTRAL		2026-02-14 23:00:50.318
cmlmxgexy0005vk9y75kn9fdb	cml6ctv4g000duqrgdybgtyte	2026-02-14 23:08:06.949	HAPPY		2026-02-14 23:08:06.949
cmlmxqe3r000dv1y1f4rrw5fl	cml6ctv270009uqrg7spxr9d4	2026-02-14 23:15:53.491	HAPPY		2026-02-14 23:15:53.491
cmlmzaii4000bvk9y15qvwj32	cml6ctvsk001nuqrgooayfxde	2026-02-14 23:59:32.14	NEUTRAL		2026-02-14 23:59:32.14
cmln09pms000568gjdkxvo7jy	cml6ctvwy001xuqrgl2hwd8y1	2026-02-15 00:26:54.34	HAPPY		2026-02-15 00:26:54.34
cmln1kc0u0003hq74qaxjtcs3	cml5g289u003uua47ulssk26x	2026-02-15 01:03:09.534	HAPPY		2026-02-15 01:03:09.534
cmln1o0tr0005hq74v755uzyf	cml5g289u003uua47ulssk26x	2026-02-15 01:06:01.439	NEUTRAL		2026-02-15 01:06:01.439
cmln1oau60007hq74i2tupli3	cml5g289u003uua47ulssk26x	2026-02-15 01:06:14.622	NEUTRAL		2026-02-15 01:06:14.622
cmlnbh0f00001jrmpn0okan5y	cml5cxygj0003v68ql9533bl3	2026-02-15 05:40:30.684	NEUTRAL		2026-02-15 05:40:30.684
cmlnbh7dk0003jrmpf3tule29	cml5cxygj0003v68ql9533bl3	2026-02-15 05:40:39.487	NEUTRAL		2026-02-15 05:40:39.487
cmlnbhev40005jrmpln1jyd55	cml5cxygj0003v68ql9533bl3	2026-02-15 05:40:49.409	NEUTRAL		2026-02-15 05:40:49.409
cmlnbhp9d0007jrmpmjn0hqht	cml5cxygj0003v68ql9533bl3	2026-02-15 05:41:02.663	NEUTRAL		2026-02-15 05:41:02.663
cmlnbhw580009jrmphe8h2bc0	cml5cxygj0003v68ql9533bl3	2026-02-15 05:41:11.805	NEUTRAL		2026-02-15 05:41:11.805
cmlnbi5fb000bjrmpp5mzdxko	cml5cxygj0003v68ql9533bl3	2026-02-15 05:41:23.614	NEUTRAL		2026-02-15 05:41:23.614
cmlnbid6g000djrmp49xnz4b3	cml5cxygj0003v68ql9533bl3	2026-02-15 05:41:33.88	NEUTRAL		2026-02-15 05:41:33.88
cmlnbii3i000fjrmpmwapjnck	cml5cxygj0003v68ql9533bl3	2026-02-15 05:41:40.254	NEUTRAL		2026-02-15 05:41:40.254
cmlnbim1t000hjrmphhbepgt3	cml5cxygj0003v68ql9533bl3	2026-02-15 05:41:45.377	NEUTRAL		2026-02-15 05:41:45.377
cmlne0yg0000367q9uh6cxaxk	cml6ctvkk0015uqrg9iuy6dh1	2026-02-15 06:52:00.481	HAPPY		2026-02-15 06:52:00.481
cmlnigp0u000193dt8psuf8l2	cml5waf57000114p7u4pb0j1l	2026-02-15 08:56:13.016	HAPPY		2026-02-15 08:56:13.016
cmlniifwk000393dt4wxizsus	cml6ctvsk001nuqrgooayfxde	2026-02-15 08:57:34.724	HAPPY		2026-02-15 08:57:34.724
cmlnjlyvf000593dtwfvjdk61	cml6ctvrh001luqrg60imh1k9	2026-02-15 09:28:18.668	HAPPY		2026-02-15 09:28:18.668
cmlnkpxpo000793dtry4qp00u	cml6ctvtp001puqrgr6j1clm9	2026-02-15 09:59:23.417	HAPPY		2026-02-15 09:59:23.417
cmlnkqhin000993dtsv99yrf9	cml6cv8w4000913l7imruilgz	2026-02-15 09:59:49.084	HAPPY		2026-02-15 09:59:49.084
cmlnks9cz0001m5ada1gipxuy	cml6cv8uy000713l7zocqn0fn	2026-02-15 10:01:11.824	HAPPY		2026-02-15 10:01:11.824
cmlnksfma0003m5ad5wk2ubvp	cml6cv8w4000913l7imruilgz	2026-02-15 10:01:20.146	HAPPY		2026-02-15 10:01:20.146
cmlnksp550001xbmue5ldmqhq	cml6cv8sm000313l7yhueq5zy	2026-02-15 10:01:32.234	NEUTRAL		2026-02-15 10:01:32.234
cmlnkt7cw0003xbmutkpc9es4	cml6cv8uy000713l7zocqn0fn	2026-02-15 10:01:55.874	HAPPY		2026-02-15 10:01:55.874
cmlnkus5l0005xbmueswrtnjy	cml6cv8uy000713l7zocqn0fn	2026-02-15 10:03:09.491	HAPPY	คือหนูจะกดเลิกเวร มันกดไม่ได้ค่ะ 😂	2026-02-15 10:03:09.491
cmlnkwq1q0007xbmus723l559	cml6ctuwf0001uqrgn7ktp9je	2026-02-15 10:04:40.286	HAPPY		2026-02-15 10:04:40.286
cmlnl3hga0009xbmup4u3y1a1	cml6cv8ts000513l7uydg8j16	2026-02-15 10:09:55.525	HAPPY		2026-02-15 10:09:55.525
cmlnl4tge0001criy1snk4m78	cml6ctvp6001fuqrgjo0cut8g	2026-02-15 10:10:57.95	HAPPY		2026-02-15 10:10:57.95
cmlnlydd40003criymufm7ers	cml6ctvgi000zuqrguiuyi2de	2026-02-15 10:33:56.56	HAPPY		2026-02-15 10:33:56.56
cmlnm1nho0005criyfnmu97mp	cml5g1qzg000iua472zcpgugd	2026-02-15 10:36:29.658	HAPPY		2026-02-15 10:36:29.658
cmlnmxj8t0007criyt47suuha	cml5g1xzx001oua47iy5u23oh	2026-02-15 11:01:17.146	NEUTRAL		2026-02-15 11:01:17.146
cmlnmzh2p0009criy1pj45ce0	cml6ctuzt0005uqrgdnihhrcg	2026-02-15 11:02:47.858	HAPPY		2026-02-15 11:02:47.858
cmlnn8m0n000bcriy21q9ifhh	cml6ctv270009uqrg7spxr9d4	2026-02-15 11:09:54.167	HAPPY		2026-02-15 11:09:54.167
cmlnn918f000bxbmuq5r0rqwy	cml6ctv3c000buqrguslcci85	2026-02-15 11:10:13.887	HAPPY		2026-02-15 11:10:13.887
cmlnnga0s000dcriy0s9ymwos	cml6ctvja0013uqrgbdjr4l0e	2026-02-15 11:15:51.869	HAPPY		2026-02-15 11:15:51.869
cmlno03kq0001pr5mzw099p8s	cml5g1vmh001aua47rlxc2pr1	2026-02-15 11:31:16.42	NEUTRAL		2026-02-15 11:31:16.42
cmlno0dgc0003pr5m5eu15gnq	cml5g1vmh001aua47rlxc2pr1	2026-02-15 11:31:29.436	NEUTRAL		2026-02-15 11:31:29.436
cmlnp2xgp00011en4y83iz8bq	cml6ctvms0019uqrg4ft54y7j	2026-02-15 12:01:27.007	HAPPY		2026-02-15 12:01:27.007
cmlnp3q2100031en4lzrih1dy	cml6ctv0x0007uqrgprf5lu7c	2026-02-15 12:02:05.142	HAPPY		2026-02-15 12:02:05.142
cmlnpkmzw00016lafe77e9bav	cml6ctvnx001buqrgfzjexn6r	2026-02-15 12:15:14.326	HAPPY		2026-02-15 12:15:14.326
cmlnqe5kj00036lafufpna05i	cml6ctuyp0003uqrgejbtvcmm	2026-02-15 12:38:11.635	NEUTRAL		2026-02-15 12:38:11.635
cmlnqv4v100056laf22v1bsln	cml6ctvwy001xuqrgl2hwd8y1	2026-02-15 12:51:21.839	HAPPY		2026-02-15 12:51:21.839
cmlnr6mum0001pgz9r8fctekg	cml5g289u003uua47ulssk26x	2026-02-15 13:00:20.185	NEUTRAL		2026-02-15 13:00:20.185
cmlnr6w7q0003pgz9wsy0fstg	cml5g289u003uua47ulssk26x	2026-02-15 13:00:32.534	NEUTRAL		2026-02-15 13:00:32.534
cmlnt8k5p00017mkczpjeyvy4	cml6ctvhm0011uqrgd2s6gv12	2026-02-15 13:57:49.219	HAPPY		2026-02-15 13:57:49.219
cmlntbuka00037mkcmtjklimu	cml5g20im0022ua4780xu5bou	2026-02-15 14:00:22.673	HAPPY		2026-02-15 14:00:22.673
cmlntcve700057mkc8xk5la7z	cml6ctvlp0017uqrgl43h68pm	2026-02-15 14:01:10.405	HAPPY		2026-02-15 14:01:10.405
cmlntd4it00077mkcd1wtlk2d	cml6ctvlp0017uqrgl43h68pm	2026-02-15 14:01:22.469	HAPPY		2026-02-15 14:01:22.469
cmlnttw7k00097mkcedcsvgoy	cml6ctvcw000tuqrgj8clzpzz	2026-02-15 14:14:24.848	HAPPY		2026-02-15 14:14:24.848
cmlociutw0005tl3s4rm9ukg6	cml5w8h240001ugxaadqh8irg	2026-02-15 22:57:42.334	NEUTRAL		2026-02-15 22:57:42.334
cmlocjlc30003yc3q2h6n81ni	cml5w8h240001ugxaadqh8irg	2026-02-15 22:58:16.9	NEUTRAL		2026-02-15 22:58:16.9
cmlocjylw0007yc3qorja3mcp	cml5w8h240001ugxaadqh8irg	2026-02-15 22:58:34.101	NEUTRAL		2026-02-15 22:58:34.101
cmloczpkr0009tl3s7ggbgg52	cml6ctv4g000duqrgdybgtyte	2026-02-15 23:10:48.891	HAPPY		2026-02-15 23:10:48.891
cmlod0jon000byc3qd67pjlim	cml6ctv5n000fuqrg94t826wg	2026-02-15 23:11:27.911	HAPPY		2026-02-15 23:11:27.911
cmlod0mln000dyc3qich2czkx	cml6ctv7w000juqrgh1tdiejn	2026-02-15 23:11:30.326	HAPPY		2026-02-15 23:11:30.326
cmlod185g000fyc3quht97tny	cml6ctv7w000juqrgh1tdiejn	2026-02-15 23:11:59.621	HAPPY		2026-02-15 23:11:59.621
cmlofr3bj0001woo45fg8cxq1	cml6ctva5000nuqrg8wh05sro	2026-02-16 00:28:05.437	NEUTRAL		2026-02-16 00:28:05.437
cmloo51tj0003exwhnk0i56wc	cml6ctv7w000juqrgh1tdiejn	2026-02-16 04:22:53.601	HAPPY		2026-02-16 04:22:53.601
cmlorfnaq000311k4kklvlkbg	cml6ctvcw000tuqrgj8clzpzz	2026-02-16 05:55:06.801	HAPPY		2026-02-16 05:55:06.801
cmlot3ply00011280i23e5yd9	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:41:49.194	HAPPY		2026-02-16 06:41:49.194
cmlot3ttw00031280sa0x9le4	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:41:54.884	HAPPY		2026-02-16 06:41:54.884
cmlot412u00051280ygwxs3qg	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:42:04.279	HAPPY		2026-02-16 06:42:04.279
cmlot46mj00015mvl2r8ueasa	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:42:11.467	HAPPY		2026-02-16 06:42:11.467
cmloti2yy00071280vcy7xrsx	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:52:59.706	HAPPY		2026-02-16 06:52:59.706
cmloti72n000912806owlqfzx	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:53:05.231	HAPPY		2026-02-16 06:53:05.231
cmlotiaax000b12805xp4p9k9	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:53:09.417	HAPPY		2026-02-16 06:53:09.417
cmlotiewe000d12806s0hg7of	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:53:15.375	HAPPY		2026-02-16 06:53:15.375
cmlotijcd000f128096txkaee	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:53:20.913	HAPPY		2026-02-16 06:53:20.913
cmlotnaln00035mvlwv7cz1dk	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 06:57:03.083	HAPPY		2026-02-16 06:57:03.083
cmlp066660003dc5hz50e92wl	cml5waf57000114p7u4pb0j1l	2026-02-16 09:59:41.295	HAPPY		2026-02-16 09:59:41.295
cmlp08fc80001i4w9513qzoga	cml6cv8sm000313l7yhueq5zy	2026-02-16 10:01:26.488	HAPPY		2026-02-16 10:01:26.488
cmlp09mj30003i4w94tqs4zn7	cml6ctvrh001luqrg60imh1k9	2026-02-16 10:02:22.46	HAPPY		2026-02-16 10:02:22.46
cmlp09xyo0005i4w9t4tyhyqs	cml6ctvp6001fuqrgjo0cut8g	2026-02-16 10:02:37.489	HAPPY		2026-02-16 10:02:37.489
cmlp0ah240007i4w9v1z40w73	cml6ctvp6001fuqrgjo0cut8g	2026-02-16 10:03:02.026	HAPPY		2026-02-16 10:03:02.026
cmlp0czo40009i4w9reyaeofc	cml6ctvrh001luqrg60imh1k9	2026-02-16 10:04:59.456	HAPPY		2026-02-16 10:04:59.456
cmlp0dsf60005dc5hjhcup4ae	cml6cv8uy000713l7zocqn0fn	2026-02-16 10:05:36.931	HAPPY		2026-02-16 10:05:36.931
cmlp0gb90000bi4w9y1rqxbq3	cml6ctv7w000juqrgh1tdiejn	2026-02-16 10:07:33.372	HAPPY		2026-02-16 10:07:33.372
cmlp0ght3000di4w9wcsjfcxc	cml6ctuwf0001uqrgn7ktp9je	2026-02-16 10:07:43.144	HAPPY		2026-02-16 10:07:43.144
cmlp1cq1r000fi4w94ytx595e	cml6ctvhm0011uqrgd2s6gv12	2026-02-16 10:32:46.816	HAPPY		2026-02-16 10:32:46.816
cmlp1lwf80009dc5hnvy52qji	cml5g1qzg000iua472zcpgugd	2026-02-16 10:39:54.759	HAPPY		2026-02-16 10:39:54.759
cmlp1mexr000bdc5h3nbva0l1	cml5g1qzg000iua472zcpgugd	2026-02-16 10:40:18.975	HAPPY		2026-02-16 10:40:18.975
cmlp2cmws000hi4w9jjsz4680	cml5g289u003uua47ulssk26x	2026-02-16 11:00:42.364	HAPPY		2026-02-16 11:00:42.364
cmlp2f805000ji4w9hp4dz0vc	cml6ctuzt0005uqrgdnihhrcg	2026-02-16 11:02:43.013	HAPPY		2026-02-16 11:02:43.013
cmlp3ehlp000ddc5h55y3gz36	cml5g1xzx001oua47iy5u23oh	2026-02-16 11:30:08.413	NEUTRAL		2026-02-16 11:30:08.413
cmlp3eq1c000fdc5hc1rt6btp	cml5g1xzx001oua47iy5u23oh	2026-02-16 11:30:19.131	NEUTRAL		2026-02-16 11:30:19.131
cmlp3g3e9000hdc5h1shwm056	cml5g1vmh001aua47rlxc2pr1	2026-02-16 11:31:23.1	HAPPY		2026-02-16 11:31:23.1
cmlp3gl7l000jdc5hr8cahacb	cml5g1vmh001aua47rlxc2pr1	2026-02-16 11:31:46.402	HAPPY		2026-02-16 11:31:46.402
cmlp3gw0q000ldc5h8omf5xeg	cml5g1vmh001aua47rlxc2pr1	2026-02-16 11:32:00.2	HAPPY		2026-02-16 11:32:00.2
cmlp3vpic0001axij6dibaz0n	cml6ctv270009uqrg7spxr9d4	2026-02-16 11:43:31.813	HAPPY		2026-02-16 11:43:31.813
cmlp3vurp0005awrcw84q6uyy	cml6ctv3c000buqrguslcci85	2026-02-16 11:43:38.63	HAPPY		2026-02-16 11:43:38.63
cmlp4psgn0005axijpgedcmpj	cml6ctvms0019uqrg4ft54y7j	2026-02-16 12:06:55.097	HAPPY		2026-02-16 12:06:55.097
cmlp4qxhj0007axijet3goxbe	cml6ctv0x0007uqrgprf5lu7c	2026-02-16 12:07:48.488	HAPPY		2026-02-16 12:07:48.488
cmlp4uwpm0009axij5tonj9h2	cml6ctvnx001buqrgfzjexn6r	2026-02-16 12:10:53.888	HAPPY		2026-02-16 12:10:53.888
cmlp5elio0007awrcihrytjf8	cml6ctuyp0003uqrgejbtvcmm	2026-02-16 12:26:12.72	NEUTRAL		2026-02-16 12:26:12.72
cmlp5gwsd0009awrcn650snup	cml6ctva5000nuqrg8wh05sro	2026-02-16 12:28:00.429	HAPPY		2026-02-16 12:28:00.429
cmlp5l4xe000bawrcxu3wm0vv	cml6ctvwy001xuqrgl2hwd8y1	2026-02-16 12:31:17.596	HAPPY		2026-02-16 12:31:17.596
cmlp8k43v0001j6v7bdjlw80r	cml6ctvgi000zuqrguiuyi2de	2026-02-16 13:54:28.939	HAPPY		2026-02-16 13:54:28.939
cmlp8l4e10001hzmf4zwa1jhp	cml6ctvja0013uqrgbdjr4l0e	2026-02-16 13:55:15.961	HAPPY		2026-02-16 13:55:15.961
cmlp8ly8y0003j6v7hblsyx0d	cml5g20im0022ua4780xu5bou	2026-02-16 13:55:54.659	NEUTRAL		2026-02-16 13:55:54.659
cmlp8oj4e0003hzmfdehd1u39	cml5g22hz002gua47temxhj1t	2026-02-16 13:57:55.023	HAPPY		2026-02-16 13:57:55.023
cmlp8spt20005hzmfnhh5eukv	cml6ctvlp0017uqrgl43h68pm	2026-02-16 14:01:10.096	HAPPY		2026-02-16 14:01:10.096
cmlpa060a0001hlywzv43qyuy	cml6ctveb000vuqrg3ulgugaj	2026-02-16 14:34:57.291	HAPPY	.	2026-02-16 14:34:57.291
cmlpr6eoh0003ymaqqvbqfe0g	cml6ctvkk0015uqrg9iuy6dh1	2026-02-16 22:35:41.951	HAPPY		2026-02-16 22:35:41.951
cmlps75tl00012d1c9sw3lf9r	cml6ctv4g000duqrgdybgtyte	2026-02-16 23:04:16.74	HAPPY		2026-02-16 23:04:16.74
cmlps8kda00032d1cm6dz06he	cml6ctv5n000fuqrg94t826wg	2026-02-16 23:05:22.249	SAD		2026-02-16 23:05:22.249
cmlq6vvgj0001fhskjmdytzy7	cml6ctveb000vuqrg3ulgugaj	2026-02-17 05:55:24.335	HAPPY	.	2026-02-17 05:55:24.335
cmlq6yx540003fhski14th1u0	cml5w8h240001ugxaadqh8irg	2026-02-17 05:57:46.696	NEUTRAL		2026-02-17 05:57:46.696
cmlq8acti0001j7lnjlx1i87k	cml6ctvkk0015uqrg9iuy6dh1	2026-02-17 06:34:39.847	HAPPY		2026-02-17 06:34:39.847
cmlqfo6km00032d9dzkx8e1sd	cml6cv8sm000313l7yhueq5zy	2026-02-17 10:01:22.246	HAPPY		2026-02-17 10:01:22.246
cmlqfp0930003ry0whf5p0oab	cml6ctvp6001fuqrgjo0cut8g	2026-02-17 10:02:00.711	HAPPY		2026-02-17 10:02:00.711
cmlqfv9410001mqkzwza4mo2b	cml6ctuwf0001uqrgn7ktp9je	2026-02-17 10:06:51.912	HAPPY		2026-02-17 10:06:51.912
cmlqg1i0800052d9d8rsg8gfp	cml6cv8qd000113l7pz55vip3	2026-02-17 10:11:43.592	HAPPY		2026-02-17 10:11:43.592
cmlqgpuav00072d9dqxrt0npm	cml6ctvhm0011uqrgd2s6gv12	2026-02-17 10:30:39.271	HAPPY		2026-02-17 10:30:39.271
cmlqgrzdk00092d9dfazy7up2	cml5g1qzg000iua472zcpgugd	2026-02-17 10:32:18.95	HAPPY		2026-02-17 10:32:18.95
cmlqgsuyk000b2d9dlujnbkb3	cml6cv8ts000513l7uydg8j16	2026-02-17 10:33:00.093	HAPPY		2026-02-17 10:33:00.093
cmlqhvcd00001nxhtmu074fwl	cml6ctuzt0005uqrgdnihhrcg	2026-02-17 11:02:55.573	HAPPY		2026-02-17 11:02:55.573
cmlqi5nz6000f2d9dfmz8z02t	cml6ctv270009uqrg7spxr9d4	2026-02-17 11:10:57.186	HAPPY		2026-02-17 11:10:57.186
cmlqi61lk000h2d9dyfw04x7n	cml6ctv3c000buqrguslcci85	2026-02-17 11:11:14.84	HAPPY		2026-02-17 11:11:14.84
cmlqiuapv000l2d9d8pm0144y	cml5g1xzx001oua47iy5u23oh	2026-02-17 11:30:06.404	NEUTRAL		2026-02-17 11:30:06.404
cmlqk9kfi0001s471he82lehy	cml6ctvms0019uqrg4ft54y7j	2026-02-17 12:09:58.446	HAPPY		2026-02-17 12:09:58.446
cmlqka1r80003s471ibda4wqw	cml6ctvms0019uqrg4ft54y7j	2026-02-17 12:10:20.687	HAPPY		2026-02-17 12:10:20.687
cmlqkdarx0005s471v39r6l72	cml6ctv0x0007uqrgprf5lu7c	2026-02-17 12:12:52.557	HAPPY		2026-02-17 12:12:52.557
cmlqkdb640007s471x05ylvfq	cml6ctvnx001buqrgfzjexn6r	2026-02-17 12:12:53.068	HAPPY		2026-02-17 12:12:53.068
cmlql65zg0001in20nxmk40l3	cml6ctuyp0003uqrgejbtvcmm	2026-02-17 12:35:19.372	NEUTRAL		2026-02-17 12:35:19.372
cmlql864w0003in20u5u3zi6q	cml6ctva5000nuqrg8wh05sro	2026-02-17 12:36:52.668	HAPPY		2026-02-17 12:36:52.668
cmlqnzpgo0001fnmv7usbhyko	cml6ctvgi000zuqrguiuyi2de	2026-02-17 13:54:16.873	HAPPY		2026-02-17 13:54:16.873
cmlqo0dt10001oa8bn3fifpb5	cml6ctvja0013uqrgbdjr4l0e	2026-02-17 13:54:48.416	HAPPY		2026-02-17 13:54:48.416
cmlqo14yj0005oa8bm2zhnj31	cml5g289u003uua47ulssk26x	2026-02-17 13:55:23.611	NEUTRAL		2026-02-17 13:55:23.611
cmlqo193g0007oa8bcoigk93b	cml5g20im0022ua4780xu5bou	2026-02-17 13:55:28.763	HAPPY		2026-02-17 13:55:28.763
cmlqo9al20003fnmv9cxlvqcv	cml6ctvlp0017uqrgl43h68pm	2026-02-17 14:01:43.939	HAPPY		2026-02-17 14:01:43.939
cmlqotkwe0001uwryj2dusm9v	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 14:17:30.638	HAPPY		2026-02-17 14:17:30.638
cmlqou4jj0003uwry036x0jws	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 14:17:55.885	HAPPY		2026-02-17 14:17:55.885
cmlqoudxn0005uwry77fcf3ca	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 14:18:08.268	HAPPY		2026-02-17 14:18:08.268
cmlqour7n0007uwrym0bx4oe7	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 14:18:25.264	HAPPY		2026-02-17 14:18:25.264
cmlqouyj80009uwrys81zddal	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 14:18:34.965	HAPPY		2026-02-17 14:18:34.965
cmlqovfk0000buwrywc37mkr4	cml6ctvcw000tuqrgj8clzpzz	2026-02-17 14:18:57.025	HAPPY		2026-02-17 14:18:57.025
cmlr7sknm000943ng7ym9fg48	cml6ctv7w000juqrgh1tdiejn	2026-02-17 23:08:36.37	HAPPY		2026-02-17 23:08:36.37
cmlr7ve1i000f43ngbef3mj79	cml6ctv4g000duqrgdybgtyte	2026-02-17 23:10:47.767	HAPPY		2026-02-17 23:10:47.767
cmlr84j2q00055z4pctkdko4v	cml6ctv5n000fuqrg94t826wg	2026-02-17 23:17:53.981	HAPPY		2026-02-17 23:17:53.981
cmlrlhnqh0001g4l9wmlctjcs	cml5g1vmh001aua47rlxc2pr1	2026-02-18 05:32:01.559	NEUTRAL		2026-02-18 05:32:01.559
cmlrm5g8o0003scfxlqr3npyd	cml6ctvcw000tuqrgj8clzpzz	2026-02-18 05:50:31.801	HAPPY		2026-02-18 05:50:31.801
cmlrmfqia0003g4l9sizk7kve	cml5w8h240001ugxaadqh8irg	2026-02-18 05:58:31.449	NEUTRAL		2026-02-18 05:58:31.449
cmlro57vz0005g4l9plw34v03	cml6ctvkk0015uqrg9iuy6dh1	2026-02-18 06:46:20.207	HAPPY		2026-02-18 06:46:20.207
cmlruxvxo0001r57gei4ijqc2	cml5waf57000114p7u4pb0j1l	2026-02-18 09:56:35.228	HAPPY		2026-02-18 09:56:35.228
cmlruyamd0003r57g783gk204	cml6ctvtp001puqrgr6j1clm9	2026-02-18 09:56:54.261	HAPPY		2026-02-18 09:56:54.261
cmlrv0zvj0003vywpzah2viuy	cml6ctvtp001puqrgr6j1clm9	2026-02-18 09:59:00.3	HAPPY		2026-02-18 09:59:00.3
cmlrv3xy40005vywp1egcxi8p	cml6cv8sm000313l7yhueq5zy	2026-02-18 10:01:17.981	HAPPY		2026-02-18 10:01:17.981
cmlrv3z2e0007vywpz6uxtzaf	cml6ctvqa001huqrgn8fa8qe5	2026-02-18 10:01:19.431	HAPPY		2026-02-18 10:01:19.431
cmlrv66xc0009vywpajzgot8m	cml6cv8qd000113l7pz55vip3	2026-02-18 10:03:02.928	HAPPY		2026-02-18 10:03:02.928
cmlrv7n26000bvywpq2tmfz63	cml6ctvp6001fuqrgjo0cut8g	2026-02-18 10:04:10.494	HAPPY		2026-02-18 10:04:10.494
cmlrv7ntb000dvywp6w1ntrhw	cml6ctuwf0001uqrgn7ktp9je	2026-02-18 10:04:11.472	HAPPY		2026-02-18 10:04:11.472
cmlrvg30i0005r57gboqehtxz	cml6cv8ts000513l7uydg8j16	2026-02-18 10:10:44.418	HAPPY		2026-02-18 10:10:44.418
cmlrvtw1y0007r57gbqqp45db	cml6ctvrh001luqrg60imh1k9	2026-02-18 10:21:28.582	HAPPY		2026-02-18 10:21:28.582
cmlrvu3200009r57gc34dqxj8	cml6ctvrh001luqrg60imh1k9	2026-02-18 10:21:37.447	HAPPY		2026-02-18 10:21:37.447
cmlrw7s9l0001108i091grwqw	cml5g1qzg000iua472zcpgugd	2026-02-18 10:32:16.788	HAPPY		2026-02-18 10:32:16.788
cmlrwyzdq0003108idl2j7vf6	cml6ctvhm0011uqrgd2s6gv12	2026-02-18 10:53:25.79	HAPPY		2026-02-18 10:53:25.79
cmlrxa3vl0005108iyipbmou9	cml6ctvwy001xuqrgl2hwd8y1	2026-02-18 11:02:04.833	HAPPY		2026-02-18 11:02:04.833
cmlrxl5az0009108i7jbgirn7	cml6ctv3c000buqrguslcci85	2026-02-18 11:10:39.688	HAPPY		2026-02-18 11:10:39.688
cmlrxlolc000b108izms61cnb	cml6ctv270009uqrg7spxr9d4	2026-02-18 11:11:04.897	HAPPY		2026-02-18 11:11:04.897
cmlrywhyg000d108ifsjp04d9	cml6ctvnx001buqrgfzjexn6r	2026-02-18 11:47:29.129	HAPPY		2026-02-18 11:47:29.129
cmlryww2h000f108i09e47xem	cml6ctvnx001buqrgfzjexn6r	2026-02-18 11:47:47.206	HAPPY		2026-02-18 11:47:47.206
cmlrzl8bx0001gm1gglx8kmlg	cml6ctvms0019uqrg4ft54y7j	2026-02-18 12:06:43.053	HAPPY		2026-02-18 12:06:43.053
cmlrzwcer0001539xqxoew2sq	cml6ctv0x0007uqrgprf5lu7c	2026-02-18 12:15:21.555	HAPPY		2026-02-18 12:15:21.555
cmls0ih130003539xxaqajrap	cml6ctuyp0003uqrgejbtvcmm	2026-02-18 12:32:33.751	NEUTRAL		2026-02-18 12:32:33.751
cmls0jf1g0005539xjw4gtw9e	cml6ctva5000nuqrg8wh05sro	2026-02-18 12:33:18.052	HAPPY		2026-02-18 12:33:18.052
cmls3etqb000113x1xdzuz5yt	cml6ctvja0013uqrgbdjr4l0e	2026-02-18 13:53:42.659	HAPPY		2026-02-18 13:53:42.659
cmls3f0yw000313x1p27hsp4y	cml6ctvgi000zuqrguiuyi2de	2026-02-18 13:53:52.041	HAPPY		2026-02-18 13:53:52.041
cmls3odex000513x18o4m2avo	cml6ctvlp0017uqrgl43h68pm	2026-02-18 14:01:07.859	HAPPY		2026-02-18 14:01:07.859
cmls3ok290001u5qzayxg56zt	cml6ctvlp0017uqrgl43h68pm	2026-02-18 14:01:16.69	HAPPY		2026-02-18 14:01:16.69
cmls3oqs90003u5qzoq5iqefl	cml6ctvlp0017uqrgl43h68pm	2026-02-18 14:01:25.402	HAPPY		2026-02-18 14:01:25.402
cmls4dxm00005u5qziwcxcmyl	cml5cxygj0003v68ql9533bl3	2026-02-18 14:21:00.424	NEUTRAL		2026-02-18 14:21:00.424
cmls4hmks0007u5qzvrn4s9os	cml5g20im0022ua4780xu5bou	2026-02-18 14:23:52.973	HAPPY		2026-02-18 14:23:52.973
cmlsn2lfu00078v2vkoste7rf	cml6ctv5n000fuqrg94t826wg	2026-02-18 23:04:04.146	HAPPY		2026-02-18 23:04:04.146
cmlsoyh450007j7981ufh9jtd	cml6ctvsk001nuqrgooayfxde	2026-02-18 23:56:51.144	SAD		2026-02-18 23:56:51.144
cmlsoyqeh000110xh41rblyc7	cml6ctvsk001nuqrgooayfxde	2026-02-18 23:57:02.074	SAD		2026-02-18 23:57:02.074
cmlt1ze32000b86e4kybztn5r	cml6ctveb000vuqrg3ulgugaj	2026-02-19 06:01:29.103	HAPPY	.	2026-02-19 06:01:29.103
cmlt30ebl0003ktg61e8mdhla	cml6ctvwy001xuqrgl2hwd8y1	2026-02-19 06:30:15.468	HAPPY		2026-02-19 06:30:15.468
cmlt3ohoh000171opnpwiil89	cml6ctvkk0015uqrg9iuy6dh1	2026-02-19 06:48:59.777	HAPPY		2026-02-19 06:48:59.777
cmlt3or59000371op7dm31ao6	cml6ctvkk0015uqrg9iuy6dh1	2026-02-19 06:49:11.818	SAD		2026-02-19 06:49:11.818
cmlt3ovqy000571opw1ta2yci	cml6ctvkk0015uqrg9iuy6dh1	2026-02-19 06:49:18.011	SAD		2026-02-19 06:49:18.011
cmlt3p6u2000771op192c140x	cml6ctvkk0015uqrg9iuy6dh1	2026-02-19 06:49:32.379	SAD		2026-02-19 06:49:32.379
cmlt3q3ek00014yix97jdgv97	cml6ctvkk0015uqrg9iuy6dh1	2026-02-19 06:50:14.589	HAPPY		2026-02-19 06:50:14.589
cmltaeeo20001d615gx0acw3o	cml5waf57000114p7u4pb0j1l	2026-02-19 09:57:06.626	HAPPY		2026-02-19 09:57:06.626
cmltafcjl0003d615niqbiuu2	cml6ctvtp001puqrgr6j1clm9	2026-02-19 09:57:50.529	HAPPY		2026-02-19 09:57:50.529
cmltaify00005d615yu7tpi5z	cml6ctvsk001nuqrgooayfxde	2026-02-19 10:00:14.681	HAPPY		2026-02-19 10:00:14.681
cmltajjp4000114f75j6x4rvm	cml6ctvqa001huqrgn8fa8qe5	2026-02-19 10:01:06.203	HAPPY		2026-02-19 10:01:06.203
cmltak7rn000314f7zd02z0v1	cml6cv8sm000313l7yhueq5zy	2026-02-19 10:01:37.398	HAPPY		2026-02-19 10:01:37.398
cmltanyfb000514f71b3r1d9q	cml6cv8uy000713l7zocqn0fn	2026-02-19 10:04:32.135	HAPPY		2026-02-19 10:04:32.135
cmltb8h5h0001bq44t68erw8w	cml6cv8ts000513l7uydg8j16	2026-02-19 10:20:29.525	HAPPY		2026-02-19 10:20:29.525
cmltbmc77000112mnsav425ip	cml6ctvhm0011uqrgd2s6gv12	2026-02-19 10:31:16.292	HAPPY		2026-02-19 10:31:16.292
cmltbmu3y000312mncavs6vkp	cml5g1qzg000iua472zcpgugd	2026-02-19 10:31:39.279	HAPPY		2026-02-19 10:31:39.279
cmltcnp7w000512mnn85dc3ei	cml5g1xzx001oua47iy5u23oh	2026-02-19 11:00:19.436	NEUTRAL		2026-02-19 11:00:19.436
cmltctvnc000712mnbb94lu41	cml6ctuzt0005uqrgdnihhrcg	2026-02-19 11:05:07.482	HAPPY		2026-02-19 11:05:07.482
cmltd9bdz000912mntudian17	cml6ctv270009uqrg7spxr9d4	2026-02-19 11:17:07.943	HAPPY		2026-02-19 11:17:07.943
cmltd9nki000b12mnkkap1vc3	cml6ctv270009uqrg7spxr9d4	2026-02-19 11:17:23.507	HAPPY		2026-02-19 11:17:23.507
cmltda2a6000d12mnfe9t8d7f	cml6ctv270009uqrg7spxr9d4	2026-02-19 11:17:42.579	HAPPY		2026-02-19 11:17:42.579
cmltdb0yd00056su23su3ncw6	cml6ctv270009uqrg7spxr9d4	2026-02-19 11:18:27.733	HAPPY		2026-02-19 11:18:27.733
cmltdq6f0000f12mncf1axylj	cml6ctv270009uqrg7spxr9d4	2026-02-19 11:30:14.441	HAPPY		2026-02-19 11:30:14.441
cmltdsmjp000h12mntsy6mlhn	cml5g20im0022ua4780xu5bou	2026-02-19 11:32:08.869	HAPPY		2026-02-19 11:32:08.869
cmltesn8h00076su2lashpvig	cml6ctvms0019uqrg4ft54y7j	2026-02-19 12:00:09.165	HAPPY		2026-02-19 12:00:09.165
cmltesx8r00096su278f1vk4t	cml6ctvms0019uqrg4ft54y7j	2026-02-19 12:00:22.348	HAPPY		2026-02-19 12:00:22.348
cmltexnf5000b6su230duvine	cml6ctvnx001buqrgfzjexn6r	2026-02-19 12:04:02.898	HAPPY		2026-02-19 12:04:02.898
cmltf5hce000j12mn2nw8qrgc	cml6ctv0x0007uqrgprf5lu7c	2026-02-19 12:10:08.27	HAPPY		2026-02-19 12:10:08.27
cmltg4j6p0001tb7wekznzu87	cml6ctuyp0003uqrgejbtvcmm	2026-02-19 12:37:23.617	NEUTRAL		2026-02-19 12:37:23.617
cmltg4ovu0003tb7w72zhbdtd	cml6ctva5000nuqrg8wh05sro	2026-02-19 12:37:30.78	HAPPY		2026-02-19 12:37:30.78
cmltix11p0001e24yf8h6ezv6	cml6ctvgi000zuqrguiuyi2de	2026-02-19 13:55:32.365	HAPPY		2026-02-19 13:55:32.365
cmltixj9m000112fbnlpkdjy2	cml6ctvja0013uqrgbdjr4l0e	2026-02-19 13:55:55.978	HAPPY		2026-02-19 13:55:55.978
cmltj56xh000312fbw3dpwrfm	cml6ctvlp0017uqrgl43h68pm	2026-02-19 14:01:53.238	HAPPY		2026-02-19 14:01:53.238
cmltj5f9s000512fbjoxt2flv	cml6ctvlp0017uqrgl43h68pm	2026-02-19 14:02:04.048	HAPPY		2026-02-19 14:02:04.048
cmltj5na9000712fbpfhnjb3d	cml6ctvlp0017uqrgl43h68pm	2026-02-19 14:02:14.197	HAPPY		2026-02-19 14:02:14.197
cmltjke2e000912fbj220afpv	cml6ctvcw000tuqrgj8clzpzz	2026-02-19 14:13:42.109	HAPPY		2026-02-19 14:13:42.109
cmltk1rkf000116xhhxb3t2l9	cml5g22hz002gua47temxhj1t	2026-02-19 14:27:12.975	HAPPY		2026-02-19 14:27:12.975
cmltlllgk000316xh8rtayxxk	cml6ctv7w000juqrgh1tdiejn	2026-02-19 15:10:37.582	NEUTRAL		2026-02-19 15:10:37.582
cmltlzl13000516xhcph185ny	cml5cxygj0003v68ql9533bl3	2026-02-19 15:21:30.423	NEUTRAL		2026-02-19 15:21:30.423
cmlu2f4iz0005h06vsr2wxdub	cml5w8h240001ugxaadqh8irg	2026-02-19 23:01:29.387	NEUTRAL		2026-02-19 23:01:29.387
cmlu2w4mq0009h06vzzr45apj	cml6ctv5n000fuqrg94t826wg	2026-02-19 23:14:42.443	HAPPY		2026-02-19 23:14:42.443
cmlu6iony000h39rco1s3je8k	cml5g289u003uua47ulssk26x	2026-02-20 00:56:13.703	NEUTRAL		2026-02-20 00:56:13.703
cmluh79ps000346sy5jiqz6ru	cml6ctvcw000tuqrgj8clzpzz	2026-02-20 05:55:17.104	HAPPY		2026-02-20 05:55:17.104
cmluhdlvd000330562rtpjd4k	cml6ctvms0019uqrg4ft54y7j	2026-02-20 06:00:12.582	HAPPY		2026-02-20 06:00:12.582
cmluhdvlq00053056ah80nl8k	cml6ctvms0019uqrg4ft54y7j	2026-02-20 06:00:25.406	HAPPY		2026-02-20 06:00:25.406
cmluj41xf0003rpdriqq9ogmq	cml6ctvkk0015uqrg9iuy6dh1	2026-02-20 06:48:46.065	HAPPY		2026-02-20 06:48:46.065
cmluj4ha70005rpdrnlk3m914	cml6ctvkk0015uqrg9iuy6dh1	2026-02-20 06:49:05.965	HAPPY		2026-02-20 06:49:05.965
cmluj4kkt0007rpdr78ceg7hm	cml6ctvkk0015uqrg9iuy6dh1	2026-02-20 06:49:10.446	HAPPY		2026-02-20 06:49:10.446
cmluptym500015iaz4cd22e0o	cml5waf57000114p7u4pb0j1l	2026-02-20 09:56:52.733	HAPPY		2026-02-20 09:56:52.733
cmlupuj0o00035iazatc3r2l3	cml6ctvtp001puqrgr6j1clm9	2026-02-20 09:57:18.966	HAPPY		2026-02-20 09:57:18.966
cmlupvkc400055iazjg3ddq1n	cml6ctvsk001nuqrgooayfxde	2026-02-20 09:58:07.318	HAPPY		2026-02-20 09:58:07.318
cmlupzlkh000132puefh17qyv	cml6cv8sm000313l7yhueq5zy	2026-02-20 10:01:15.762	HAPPY		2026-02-20 10:01:15.762
cmluq0e55000332pu6r8qmk1v	cml6ctvqa001huqrgn8fa8qe5	2026-02-20 10:01:52.572	HAPPY		2026-02-20 10:01:52.572
cmluq0lse000532pub4c0517v	cml6ctvqa001huqrgn8fa8qe5	2026-02-20 10:02:02.703	HAPPY		2026-02-20 10:02:02.703
cmluq0t79000732puafjt7kbr	cml6ctvqa001huqrgn8fa8qe5	2026-02-20 10:02:12.086	HAPPY		2026-02-20 10:02:12.086
cmluq1ele000932puerfhjr24	cml6ctvrh001luqrg60imh1k9	2026-02-20 10:02:40.034	HAPPY		2026-02-20 10:02:40.034
cmluq2dt500075iaz1sncsqyx	cml6ctuwf0001uqrgn7ktp9je	2026-02-20 10:03:25.465	HAPPY		2026-02-20 10:03:25.465
cmluqdnac000b32puhmpb9a21	cml6cv8ts000513l7uydg8j16	2026-02-20 10:12:11.172	HAPPY		2026-02-20 10:12:11.172
cmlur1z4o000d32pu0uz8r0ix	cml5g1qzg000iua472zcpgugd	2026-02-20 10:31:06.264	HAPPY		2026-02-20 10:31:06.264
cmlur3lg400095iazouo0ybd6	cml6ctvhm0011uqrgd2s6gv12	2026-02-20 10:32:21.634	HAPPY		2026-02-20 10:32:21.634
cmlur4dd2000f32pu9dnprgfx	cml6ctvhm0011uqrgd2s6gv12	2026-02-20 10:32:57.816	HAPPY		2026-02-20 10:32:57.816
cmlus3bra0001lvvy4d15mb80	cml5g1xzx001oua47iy5u23oh	2026-02-20 11:00:08.67	NEUTRAL		2026-02-20 11:00:08.67
cmlus8ddr000h32pue074vb8y	cml6ctv3c000buqrguslcci85	2026-02-20 11:04:02.935	HAPPY		2026-02-20 11:04:02.935
cmlusckbj000j32pu7dr3qofx	cml6ctuzt0005uqrgdnihhrcg	2026-02-20 11:07:19.904	HAPPY		2026-02-20 11:07:19.904
cmlusr0zf0003hgzfxc87mjcp	cml6ctv270009uqrg7spxr9d4	2026-02-20 11:18:34.683	HAPPY		2026-02-20 11:18:34.683
cmlut70yl0003lvvydmt9j6id	cml5g22hz002gua47temxhj1t	2026-02-20 11:31:00.927	HAPPY		2026-02-20 11:31:00.927
cmluug2fv0001xib78jcabmb6	cml6ctvnx001buqrgfzjexn6r	2026-02-20 12:06:02.587	HAPPY		2026-02-20 12:06:02.587
cmluun7b90001ge1rdqgzcabg	cml6ctv0x0007uqrgprf5lu7c	2026-02-20 12:11:35.494	HAPPY		2026-02-20 12:11:35.494
cmluvaz4w0001uur1lcr4l8tp	cml6ctvwy001xuqrgl2hwd8y1	2026-02-20 12:30:04.419	HAPPY		2026-02-20 12:30:04.419
cmluvixtp000110hj3u950d7i	cml6ctuyp0003uqrgejbtvcmm	2026-02-20 12:36:16.189	NEUTRAL		2026-02-20 12:36:16.189
cmluvlxox0003uur1kp8dly2d	cml6ctva5000nuqrg8wh05sro	2026-02-20 12:38:35.766	HAPPY		2026-02-20 12:38:35.766
cmluw3e42000310hj6tgpjy8f	cml6cv8qd000113l7pz55vip3	2026-02-20 12:52:10.418	HAPPY		2026-02-20 12:52:10.418
cmluwfco8000510hj8urs6rqk	cml5g289u003uua47ulssk26x	2026-02-20 13:01:28.424	HAPPY		2026-02-20 13:01:28.424
cmluyb64o0005uur1jow1nxbe	cml6ctvja0013uqrgbdjr4l0e	2026-02-20 13:54:12.552	HAPPY		2026-02-20 13:54:12.552
cmluybbz90007uur1rcrsifqu	cml6ctvgi000zuqrguiuyi2de	2026-02-20 13:54:20.133	HAPPY		2026-02-20 13:54:20.133
cmluyewk4000710hj4d3shrop	cml5g1vmh001aua47rlxc2pr1	2026-02-20 13:57:06.773	NEUTRAL		2026-02-20 13:57:06.773
cmluyk7x10009uur1hmtpydiw	cml6ctvlp0017uqrgl43h68pm	2026-02-20 14:01:14.551	HAPPY		2026-02-20 14:01:14.551
cmluykeal000buur1691umz55	cml6ctvlp0017uqrgl43h68pm	2026-02-20 14:01:23.037	HAPPY		2026-02-20 14:01:23.037
cmluz33ww000duur1x9jt4ydw	cml5g20im0022ua4780xu5bou	2026-02-20 14:15:55.826	HAPPY		2026-02-20 14:15:55.826
cmluzwp4n0001l8djpli4swhw	cml5cxygj0003v68ql9533bl3	2026-02-20 14:38:56.357	HAPPY		2026-02-20 14:38:56.357
cmlv07zpw0003l8djaq7a3v0o	cml6ctveb000vuqrg3ulgugaj	2026-02-20 14:47:43.508	HAPPY	..	2026-02-20 14:47:43.508
cmlvhhe9k0003o5v7km4gf8sy	cml6ctv7w000juqrgh1tdiejn	2026-02-20 22:50:55.737	NEUTRAL		2026-02-20 22:50:55.737
cmlvht3db000311byujhf5c8a	cml5w8h240001ugxaadqh8irg	2026-02-20 23:00:01.266	NEUTRAL		2026-02-20 23:00:01.266
cmlvi5yg50001ojwqb62os3wv	cml6ctv5n000fuqrg94t826wg	2026-02-20 23:10:01.415	HAPPY		2026-02-20 23:10:01.415
cmlvi6snm0003ojwqtegf61p0	cml6ctv7w000juqrgh1tdiejn	2026-02-20 23:10:40.786	NEUTRAL		2026-02-20 23:10:40.786
cmlvv0doo003f9q91kth3xl8c	cml6ctvqa001huqrgn8fa8qe5	2026-02-21 05:09:36.227	HAPPY		2026-02-21 05:09:36.227
cmlvwmec8000512vpf6eyff4n	cml6ctv6r000huqrg08xd4xcm	2026-02-21 05:54:43.122	HAPPY		2026-02-21 05:54:43.122
cmlvxtnjv000t12vp48p9tiwz	cml6ctv7w000juqrgh1tdiejn	2026-02-21 06:28:21.499	HAPPY		2026-02-21 06:28:21.499
cmlvyh6i8000312zqcjbmwnfs	cml6ctvkk0015uqrg9iuy6dh1	2026-02-21 06:46:39.152	HAPPY		2026-02-21 06:46:39.152
cmlw09qbe0003k2i19zrmaacq	cml5w8h240001ugxaadqh8irg	2026-02-21 07:36:50.81	NEUTRAL		2026-02-21 07:36:50.81
cmlw5df0s0003idexqpzuyhac	cml6ctvtp001puqrgr6j1clm9	2026-02-21 09:59:40.655	HAPPY		2026-02-21 09:59:40.655
cmlw5e8r30005zsbmd7somj4f	cml6cv8w4000913l7imruilgz	2026-02-21 10:00:19.188	HAPPY		2026-02-21 10:00:19.188
cmlw5eksn0007zsbmk7a49x9q	cml6ctvsk001nuqrgooayfxde	2026-02-21 10:00:34.796	HAPPY		2026-02-21 10:00:34.796
cmlw5fows0009zsbmrdchmxn6	cml6cv8sm000313l7yhueq5zy	2026-02-21 10:01:27.004	HAPPY		2026-02-21 10:01:27.004
cmlw5gbkw000dzsbmovowk0i5	cml6ctvrh001luqrg60imh1k9	2026-02-21 10:01:56.176	HAPPY		2026-02-21 10:01:56.176
cmlw5op80000164yknhr75ljn	cml6ctvp6001fuqrgjo0cut8g	2026-02-21 10:08:27.313	HAPPY		2026-02-21 10:08:27.313
cmlw5stn2000564ykj5qasduj	cml6ctuwf0001uqrgn7ktp9je	2026-02-21 10:11:39.454	HAPPY		2026-02-21 10:11:39.454
cmlw5u1lr000b64ykj27e2wzg	cml6cv8qd000113l7pz55vip3	2026-02-21 10:12:36.639	HAPPY		2026-02-21 10:12:36.639
cmlw6cywc000f64ykcyj4wzns	cml6cv8ts000513l7uydg8j16	2026-02-21 10:27:19.376	HAPPY		2026-02-21 10:27:19.376
cmlw6j3d000011vpmhprgyv9b	cml6ctvhm0011uqrgd2s6gv12	2026-02-21 10:32:05.317	HAPPY		2026-02-21 10:32:05.317
cmlw6pdbk000j64ykvt3zpziq	cml5g20im0022ua4780xu5bou	2026-02-21 10:36:58.16	HAPPY		2026-02-21 10:36:58.16
cmlw7p63q0003133yl93tgti4	cml6ctuzt0005uqrgdnihhrcg	2026-02-21 11:04:48.201	HAPPY		2026-02-21 11:04:48.201
cmlw812up0003ppr5f8zm0l77	cml6ctv3c000buqrguslcci85	2026-02-21 11:14:04.082	HAPPY		2026-02-21 11:14:04.082
cmlw819md0005ppr58czuf3sa	cml6ctv3c000buqrguslcci85	2026-02-21 11:14:12.854	HAPPY		2026-02-21 11:14:12.854
cmlw826ae000311unsi6z5efn	cml6ctv270009uqrg7spxr9d4	2026-02-21 11:14:54.972	HAPPY		2026-02-21 11:14:54.972
cmlw8qzyg000511un1slyj0gp	cml5g1vmh001aua47rlxc2pr1	2026-02-21 11:34:13.385	NEUTRAL		2026-02-21 11:34:13.385
cmlw9qfc5000bppr5xct6x25z	cml6ctvms0019uqrg4ft54y7j	2026-02-21 12:01:46.277	HAPPY		2026-02-21 12:01:46.277
cmlw9xzw0000911un02irdi79	cml6ctvnx001buqrgfzjexn6r	2026-02-21 12:07:39.505	HAPPY		2026-02-21 12:07:39.505
cmlwb7euj000hppr5sebp7zg1	cml6ctva5000nuqrg8wh05sro	2026-02-21 12:42:58.412	HAPPY		2026-02-21 12:42:58.412
cmlwb7hd3000jppr5fobtqkd9	cml6ctuyp0003uqrgejbtvcmm	2026-02-21 12:43:00.415	NEUTRAL		2026-02-21 12:43:00.415
cmlwdqv3c0001g5etmz7jjkwd	cml6ctvgi000zuqrguiuyi2de	2026-02-21 13:54:04.937	HAPPY		2026-02-21 13:54:04.937
cmlwds4cy0001jo5byc9vbvso	cml6ctvja0013uqrgbdjr4l0e	2026-02-21 13:55:03.826	HAPPY		2026-02-21 13:55:03.826
cmlwe09t8000177gv04jol64n	cml6ctvlp0017uqrgl43h68pm	2026-02-21 14:01:23.929	HAPPY		2026-02-21 14:01:23.929
cmlwe0ndo000377gvc9p36qau	cml5g22hz002gua47temxhj1t	2026-02-21 14:01:41.724	HAPPY		2026-02-21 14:01:41.724
cmlwexerq000577gvox3qveww	cml5cxygj0003v68ql9533bl3	2026-02-21 14:27:10.003	HAPPY		2026-02-21 14:27:10.003
cmlwhcaoz0001hwxmpqo2df6j	cml6ctvwy001xuqrgl2hwd8y1	2026-02-21 15:34:43.785	HAPPY		2026-02-21 15:34:43.785
cmlwhdqfz0001m41qpj1cf8ta	cml6ctv6r000huqrg08xd4xcm	2026-02-21 15:35:49.716	NEUTRAL		2026-02-21 15:35:49.716
cmlwi9tyr0003hwxmjlgwb5gs	cml5g289u003uua47ulssk26x	2026-02-21 16:00:48.627	HAPPY		2026-02-21 16:00:48.627
cmlwikl080005hwxmib6guqdy	cml5g289u003uua47ulssk26x	2026-02-21 16:09:10.012	NEUTRAL		2026-02-21 16:09:10.012
cmlwxqk8w00055knxja1g2gtf	cml6ctv5n000fuqrg94t826wg	2026-02-21 23:13:43.199	HAPPY		2026-02-21 23:13:43.199
cmlx3lio100018is726slvbh9	cml5g289u003uua47ulssk26x	2026-02-22 01:57:45.794	NEUTRAL		2026-02-22 01:57:45.794
cmlx92ipd0001bx70dqxwxdhe	cml6ctvhm0011uqrgd2s6gv12	2026-02-22 04:30:55.792	HAPPY		2026-02-22 04:30:55.792
cmlxcwkrv0001919f3kouvztn	cml5w8h240001ugxaadqh8irg	2026-02-22 06:18:18.063	NEUTRAL		2026-02-22 06:18:18.063
cmlxdnqtf0003919fnoqr4303	cml6ctv7w000juqrgh1tdiejn	2026-02-22 06:39:25.827	HAPPY		2026-02-22 06:39:25.827
cmlxdx7sq00011266bo90dm3d	cml6ctvkk0015uqrg9iuy6dh1	2026-02-22 06:46:47.738	HAPPY		2026-02-22 06:46:47.738
cmlxim67m0001tv37qp3zacss	cml5waf57000114p7u4pb0j1l	2026-02-22 08:58:10.546	HAPPY		2026-02-22 08:58:10.546
cmlxiz9bh0001w7k5indi1ds5	cml6ctvrh001luqrg60imh1k9	2026-02-22 09:08:19.675	HAPPY		2026-02-22 09:08:19.675
cmlxkr22k0001x82ns7cogrtn	cml6ctvtp001puqrgr6j1clm9	2026-02-22 09:57:57.693	HAPPY		2026-02-22 09:57:57.693
cmlxkywxy0003w7k5ozepneyw	cml6ctvp6001fuqrgjo0cut8g	2026-02-22 10:04:04.083	HAPPY		2026-02-22 10:04:04.083
cmlxl2bar0003x82n8okyw0zd	cml6cv8qd000113l7pz55vip3	2026-02-22 10:06:42.867	HAPPY		2026-02-22 10:06:42.867
cmlxl3kmy0005x82n48ffqt5c	cml6ctuwf0001uqrgn7ktp9je	2026-02-22 10:07:41.627	HAPPY		2026-02-22 10:07:41.627
cmlxla79y0005w7k5p15rbmcx	cml6cv8w4000913l7imruilgz	2026-02-22 10:12:50.677	HAPPY		2026-02-22 10:12:50.677
cmlxlxhjb0007x82nj1mwk69s	cml5g1qzg000iua472zcpgugd	2026-02-22 10:30:57.062	HAPPY		2026-02-22 10:30:57.062
cmlxn2vwc0001gtvs5px4dapq	cml6ctuzt0005uqrgdnihhrcg	2026-02-22 11:03:08.797	HAPPY		2026-02-22 11:03:08.797
cmlxndd970001rrrcd6bmolgw	cml6ctv3c000buqrguslcci85	2026-02-22 11:11:17.852	HAPPY		2026-02-22 11:11:17.852
cmlxo1m760005gtvsdsihb2oa	cml5g1xzx001oua47iy5u23oh	2026-02-22 11:30:08.966	NEUTRAL		2026-02-22 11:30:08.966
cmlxo3oq10001vgcj1zw1gm9x	cml5g1vmh001aua47rlxc2pr1	2026-02-22 11:31:45.559	NEUTRAL		2026-02-22 11:31:45.559
cmlxp78a60007gtvs65cyip5v	cml6ctvms0019uqrg4ft54y7j	2026-02-22 12:02:30.702	HAPPY		2026-02-22 12:02:30.702
cmlxp7lrj0009gtvseuy5n94f	cml6ctvms0019uqrg4ft54y7j	2026-02-22 12:02:47.958	HAPPY		2026-02-22 12:02:47.958
cmlxprm0j000bgtvsg0uir5vl	cml6ctv0x0007uqrgprf5lu7c	2026-02-22 12:18:19.708	HAPPY		2026-02-22 12:18:19.708
cmlxpytk40001bdd7gfiw2mt8	cml6ctvnx001buqrgfzjexn6r	2026-02-22 12:23:57.988	HAPPY		2026-02-22 12:23:57.988
cmlxqgo4y0001o3ktwovum4gc	cml6ctuyp0003uqrgejbtvcmm	2026-02-22 12:37:50.551	NEUTRAL		2026-02-22 12:37:50.551
cmlxqio0a0003bdd71igys8fh	cml6ctva5000nuqrg8wh05sro	2026-02-22 12:39:23.914	HAPPY		2026-02-22 12:39:23.914
cmlxt5ls60001kwxsp3koql3r	cml6ctvgi000zuqrguiuyi2de	2026-02-22 13:53:13.351	HAPPY		2026-02-22 13:53:13.351
cmlxt5tf10001plkyeuse88dx	cml6ctvja0013uqrgbdjr4l0e	2026-02-22 13:53:21.827	HAPPY		2026-02-22 13:53:21.827
cmlxtfumd0003plkyzq3efq0i	cml6ctvlp0017uqrgl43h68pm	2026-02-22 14:01:11.145	HAPPY		2026-02-22 14:01:11.145
cmlxtx94h0005plky6kwh8gtn	cml5g22hz002gua47temxhj1t	2026-02-22 14:14:43.105	HAPPY		2026-02-22 14:14:43.105
cmlxuf7zz0007plkyj9xklfqa	cml5cxygj0003v68ql9533bl3	2026-02-22 14:28:41.44	HAPPY		2026-02-22 14:28:41.44
cmlxupdiv0001cgfy41lpjnm3	cml6ctveb000vuqrg3ulgugaj	2026-02-22 14:36:35.383	HAPPY	....	2026-02-22 14:36:35.383
cmlxx21170003cgfyehz6sg0g	cml6ctv6r000huqrg08xd4xcm	2026-02-22 15:42:24.955	NEUTRAL		2026-02-22 15:42:24.955
cmlydaz3w00056odty7q81a1b	cml6ctv5n000fuqrg94t826wg	2026-02-22 23:17:16.006	HAPPY		2026-02-22 23:17:16.006
cmlyrb6y700031013gkg6xzfa	cml6ctveb000vuqrg3ulgugaj	2026-02-23 05:49:21.007	HAPPY	.	2026-02-23 05:49:21.007
cmlyrfxh100035nf5163n47pi	cml5w8h240001ugxaadqh8irg	2026-02-23 05:53:02.005	NEUTRAL		2026-02-23 05:53:02.005
\.


--
-- Data for Name: Leave; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Leave" (id, "userId", type, "startDate", "endDate", reason, status, "approvedBy", "approvedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LeaveBalance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LeaveBalance" (id, "userId", year, "sickLeave", "annualLeave", "personalLeave", "usedSick", "usedAnnual", "usedPersonal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "userId", type, title, message, link, "isRead", "createdAt") FROM stdin;
\.


--
-- Data for Name: OneOnOneLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OneOnOneLog" (id, "userId", "supervisorId", date, topic, note, "actionItems", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: OvertimeRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OvertimeRequest" (id, "userId", date, hours, reason, status, "approvedById", "approvedAt", "rejectReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PayrollPeriod; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollPeriod" (id, name, "startDate", "endDate", "payDate", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PayrollRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollRecord" (id, "periodId", "userId", "workDays", "totalHours", "overtimeHours", "basePay", "overtimePay", "latePenalty", "advanceDeduct", "otherDeduct", "netPay", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Permission" (id, code, name, "group", description, "sortOrder", "createdAt", "updatedAt") FROM stdin;
cml6r7lwd00007r398jnn72pn	shift.view	ดูตารางกะ	ตารางกะ	\N	1	2026-02-03 15:29:00.829	2026-02-03 15:31:52.749
cml6r7lz000017r39rrx7cotc	shift.edit	แก้ไขกะพนักงาน	ตารางกะ	\N	2	2026-02-03 15:29:00.924	2026-02-03 15:31:52.839
cml6r7m0a00027r39zhg1dysw	shift.generate	สร้างกะอัตโนมัติ	ตารางกะ	\N	3	2026-02-03 15:29:00.97	2026-02-03 15:31:52.885
cml6r7m1o00037r39dg9bb3s3	shift_type.manage	จัดการประเภทกะ	ตารางกะ	\N	4	2026-02-03 15:29:01.02	2026-02-03 15:31:52.925
cml6r7m3100047r39190fuylu	employee.view	ดูรายชื่อพนักงาน	พนักงาน	\N	10	2026-02-03 15:29:01.069	2026-02-03 15:31:52.965
cml6r7m4900057r39ksbcwtri	employee.edit	แก้ไขข้อมูลพนักงาน	พนักงาน	\N	11	2026-02-03 15:29:01.113	2026-02-03 15:31:53.008
cml6r7m5i00067r39w5s9vrj4	employee.delete	ลบพนักงาน	พนักงาน	\N	12	2026-02-03 15:29:01.158	2026-02-03 15:31:53.061
cml6r7m6s00077r39etkhz5wc	attendance.view	ดูการลงเวลา	ลงเวลา	\N	20	2026-02-03 15:29:01.204	2026-02-03 15:31:53.103
cml6r7m8a00087r39y1mrz4p9	attendance.approve	อนุมัติการลงเวลา	ลงเวลา	\N	21	2026-02-03 15:29:01.259	2026-02-03 15:31:53.144
cml6r7m9r00097r39mkk307dy	request.view	ดูคำขอ	คำขอ	\N	30	2026-02-03 15:29:01.311	2026-02-03 15:31:53.186
cml6r7mb1000a7r39liruztph	request.approve	อนุมัติคำขอ	คำขอ	\N	31	2026-02-03 15:29:01.357	2026-02-03 15:31:53.226
cml6r7mcb000b7r39pavp0mm9	report.view	ดูรายงาน	รายงาน	\N	40	2026-02-03 15:29:01.403	2026-02-03 15:31:53.267
cml6r7mdj000c7r392qyltc4h	report.export	export รายงาน	รายงาน	\N	41	2026-02-03 15:29:01.448	2026-02-03 15:31:53.307
cml6r7mf3000d7r39b2rbluab	station.view	ดูสถานี	สถานี	\N	50	2026-02-03 15:29:01.503	2026-02-03 15:31:53.348
cml6r7mhp000e7r39gstn3dxk	station.edit	แก้ไขสถานี	สถานี	\N	51	2026-02-03 15:29:01.597	2026-02-03 15:31:53.416
cml6r7miz000f7r39r8axw8hc	settings.manage	จัดการตั้งค่าระบบ	ตั้งค่า	\N	60	2026-02-03 15:29:01.643	2026-02-03 15:31:53.457
cml6r7mk8000g7r39o155ddlo	permission.manage	จัดการสิทธิ์ role	สิทธิ์	\N	70	2026-02-03 15:29:01.689	2026-02-03 15:31:53.499
\.


--
-- Data for Name: ProfileEditRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProfileEditRequest" (id, "userId", "fieldName", "fieldLabel", "oldValue", "newValue", status, "createdAt", "reviewedAt", "reviewedBy", "rejectReason") FROM stdin;
cmlbtzom90001j32g22b3nsux	cml6ctv7w000juqrgh1tdiejn	emergencyContactPhone	เบอร์ผู้ติดต่อฉุกเฉิน	\N	0619291301	APPROVED	2026-02-07 04:45:40.834	2026-02-07 06:16:59.134	cml61rz7u000111dofdoy94sd	\N
cmlbpxi1d00013ne1hj6dam5a	cml6cv8ts000513l7uydg8j16	phone	เบอร์โทร	0000010839	0988198330	APPROVED	2026-02-07 02:52:00.529	2026-02-07 06:17:04.761	cml61rz7u000111dofdoy94sd	\N
cmla28fip00014e166un7xwu8	cml6ctveb000vuqrg3ulgugaj	bankName	ชื่อธนาคาร	\N	อนุสรณ์ ยอดดำเนิน	APPROVED	2026-02-05 23:00:53.521	2026-02-07 06:17:11.65	cml61rz7u000111dofdoy94sd	\N
cml9apkg6000185qph11o34i6	cml6cv8qd000113l7pz55vip3	nickName	ชื่อเล่น	จ๋า	จ๋า 	APPROVED	2026-02-05 10:10:23.815	2026-02-07 06:17:16.844	cml61rz7u000111dofdoy94sd	\N
\.


--
-- Data for Name: PushSubscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushSubscription" (id, endpoint, p256dh, auth, "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ReviewPeriod; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReviewPeriod" (id, title, "startDate", "endDate", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ReviewSubmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReviewSubmission" (id, "employeeId", "periodId", "selfReview", "managerReview", rating, status, "submittedAt", "completedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RolePermission" (id, role, "permissionId", "createdAt") FROM stdin;
cmlab1p0900003sibyody153j	CASHIER	cml6r7lwd00007r398jnn72pn	2026-02-06 03:07:35.77
cmlab1p0900013sibbjtwyxth	CASHIER	cml6r7lz000017r39rrx7cotc	2026-02-06 03:07:35.77
cmlab1p0900023sibng2rx8yf	CASHIER	cml6r7m0a00027r39zhg1dysw	2026-02-06 03:07:35.77
cmlab1p0900033sibj6ppnnbu	CASHIER	cml6r7m1o00037r39dg9bb3s3	2026-02-06 03:07:35.77
cmlab1p0900043sibonlmue1w	CASHIER	cml6r7m3100047r39190fuylu	2026-02-06 03:07:35.77
cmlab1p0900053siblh9ka4gb	CASHIER	cml6r7m6s00077r39etkhz5wc	2026-02-06 03:07:35.77
cmlab1p0900063sibw9bmhg4d	CASHIER	cml6r7m8a00087r39y1mrz4p9	2026-02-06 03:07:35.77
cmlab1p0900073sib725xshsb	CASHIER	cml6r7m9r00097r39mkk307dy	2026-02-06 03:07:35.77
cmlab1p0900083sibf1ry8m5v	CASHIER	cml6r7mb1000a7r39liruztph	2026-02-06 03:07:35.77
cmlab1p0900093sibf8zxnk6p	CASHIER	cml6r7mcb000b7r39pavp0mm9	2026-02-06 03:07:35.77
cmlab1p09000a3sibmjkt9zq7	CASHIER	cml6r7mf3000d7r39b2rbluab	2026-02-06 03:07:35.77
cml6rbbb9000iavd4lfk3mm68	ADMIN	cml6r7lwd00007r398jnn72pn	2026-02-03 15:31:53.733
cml6rbbdm000kavd49ayk8iq9	ADMIN	cml6r7lz000017r39rrx7cotc	2026-02-03 15:31:53.818
cml6rbber000mavd4jivlnwjs	ADMIN	cml6r7m0a00027r39zhg1dysw	2026-02-03 15:31:53.859
cml6rbbfv000oavd45n4yfttt	ADMIN	cml6r7m1o00037r39dg9bb3s3	2026-02-03 15:31:53.899
cml6rbbh0000qavd4yf01ciwo	ADMIN	cml6r7m3100047r39190fuylu	2026-02-03 15:31:53.94
cml6rbbi6000savd4t5w0njzq	ADMIN	cml6r7m4900057r39ksbcwtri	2026-02-03 15:31:53.982
cml6rbbja000uavd4o5k455rd	ADMIN	cml6r7m5i00067r39w5s9vrj4	2026-02-03 15:31:54.022
cml6rbbke000wavd4do1rxqsy	ADMIN	cml6r7m6s00077r39etkhz5wc	2026-02-03 15:31:54.062
cml6rbbli000yavd4bqckcvtc	ADMIN	cml6r7m8a00087r39y1mrz4p9	2026-02-03 15:31:54.102
cml6rbbmm0010avd4uphic4g3	ADMIN	cml6r7m9r00097r39mkk307dy	2026-02-03 15:31:54.143
cml6rbbnq0012avd423dqrpd3	ADMIN	cml6r7mb1000a7r39liruztph	2026-02-03 15:31:54.183
cml6rbbov0014avd4sa3r26yz	ADMIN	cml6r7mcb000b7r39pavp0mm9	2026-02-03 15:31:54.224
cml6rbbpy0016avd4uejrciz6	ADMIN	cml6r7mdj000c7r392qyltc4h	2026-02-03 15:31:54.262
cml6rbbr20018avd4of2b82kk	ADMIN	cml6r7mf3000d7r39b2rbluab	2026-02-03 15:31:54.302
cml6rbbs6001aavd4gz6irpfj	ADMIN	cml6r7mhp000e7r39gstn3dxk	2026-02-03 15:31:54.342
cml6rbbt9001cavd4ckzjg3b9	ADMIN	cml6r7miz000f7r39r8axw8hc	2026-02-03 15:31:54.381
cml6rbbud001eavd4xerxb6hs	ADMIN	cml6r7mk8000g7r39o155ddlo	2026-02-03 15:31:54.421
cml6rlbq9000014ed44qzq3in	HR	cml6r7lwd00007r398jnn72pn	2026-02-03 15:39:40.833
cml6rlbq9000114ed3wbk4vzc	HR	cml6r7lz000017r39rrx7cotc	2026-02-03 15:39:40.833
cml6rlbq9000214ed3rcsoa4q	HR	cml6r7m0a00027r39zhg1dysw	2026-02-03 15:39:40.833
cml6rlbq9000314edyoo03ivu	HR	cml6r7m1o00037r39dg9bb3s3	2026-02-03 15:39:40.833
cml6rlbq9000414edeaqq1xrl	HR	cml6r7m3100047r39190fuylu	2026-02-03 15:39:40.833
cml6rlbq9000514ed9l9ew6se	HR	cml6r7m4900057r39ksbcwtri	2026-02-03 15:39:40.833
cml6rlbq9000614edket1q4e5	HR	cml6r7m5i00067r39w5s9vrj4	2026-02-03 15:39:40.833
cml6rlbq9000714ed9biq5pl9	HR	cml6r7m6s00077r39etkhz5wc	2026-02-03 15:39:40.833
cml6rlbq9000814ed7x05q1rk	HR	cml6r7m8a00087r39y1mrz4p9	2026-02-03 15:39:40.833
cml6rlbq9000914edyeg9w5ga	HR	cml6r7m9r00097r39mkk307dy	2026-02-03 15:39:40.833
cml6rlbq9000a14ediu2h2fl9	HR	cml6r7mb1000a7r39liruztph	2026-02-03 15:39:40.833
cml6rlbq9000b14edcp5fyf2p	HR	cml6r7mcb000b7r39pavp0mm9	2026-02-03 15:39:40.833
cml6rlbq9000c14edgexv4sau	HR	cml6r7mdj000c7r392qyltc4h	2026-02-03 15:39:40.833
cml6rlbq9000d14edw9w34qwo	HR	cml6r7mf3000d7r39b2rbluab	2026-02-03 15:39:40.833
cml6rlbq9000e14edvxicoqxn	HR	cml6r7mhp000e7r39gstn3dxk	2026-02-03 15:39:40.833
cml6rlbq9000f14ed8it3krjk	HR	cml6r7miz000f7r39r8axw8hc	2026-02-03 15:39:40.833
cml6rlbq9000g14edgul9qo1p	HR	cml6r7mk8000g7r39o155ddlo	2026-02-03 15:39:40.833
cml6rldr3000h14edl9nd6szs	MANAGER	cml6r7lwd00007r398jnn72pn	2026-02-03 15:39:43.455
cml6rldr3000i14ed17aii9nd	MANAGER	cml6r7lz000017r39rrx7cotc	2026-02-03 15:39:43.455
cml6rldr3000j14ed35fq09sq	MANAGER	cml6r7m3100047r39190fuylu	2026-02-03 15:39:43.455
cml6rldr3000k14edtyghqm42	MANAGER	cml6r7m4900057r39ksbcwtri	2026-02-03 15:39:43.455
cml6rldr3000l14edrmncfbcw	MANAGER	cml6r7m5i00067r39w5s9vrj4	2026-02-03 15:39:43.455
cml6rldr3000m14edpb2z1q3n	MANAGER	cml6r7m6s00077r39etkhz5wc	2026-02-03 15:39:43.455
cml6rldr3000n14edcfydtyhi	MANAGER	cml6r7m8a00087r39y1mrz4p9	2026-02-03 15:39:43.455
cml6rldr3000o14ede6ddjdwr	MANAGER	cml6r7m9r00097r39mkk307dy	2026-02-03 15:39:43.455
cml6rldr3000p14edgraw35zf	MANAGER	cml6r7mb1000a7r39liruztph	2026-02-03 15:39:43.455
cml6rldr3000q14ed0aaizouq	MANAGER	cml6r7mcb000b7r39pavp0mm9	2026-02-03 15:39:43.455
cml6rldr3000r14edbdr36nj6	MANAGER	cml6r7mdj000c7r392qyltc4h	2026-02-03 15:39:43.455
cml6rldr3000s14edcq61w2yy	MANAGER	cml6r7mf3000d7r39b2rbluab	2026-02-03 15:39:43.455
\.


--
-- Data for Name: Shift; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Shift" (id, code, name, "startTime", "endTime", "stationId", "breakMinutes", "isNightShift", "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cml66dlkw000013mitod5upug	S-0530	Standard 05:30	05:30	17:30	\N	60	f	t	0	2026-02-03 05:45:48.416	2026-02-03 05:45:48.416
cml66dlno000113mih77suyuc	S-0600	Standard 06:00	06:00	18:00	\N	60	f	t	0	2026-02-03 05:45:48.516	2026-02-03 05:45:48.516
cml66dlp1000213mi39m55khx	S-0630	Standard 06:30	06:30	18:30	\N	60	f	t	0	2026-02-03 05:45:48.566	2026-02-03 05:45:48.566
cml66dlqb000313mi4rwg7lgc	S-0700	Standard 07:00	07:00	19:00	\N	60	f	t	0	2026-02-03 05:45:48.611	2026-02-03 05:45:48.611
cml66dlrp000413miapldg649	S-0730	Standard 07:30	07:30	19:30	\N	60	f	t	0	2026-02-03 05:45:48.662	2026-02-03 05:45:48.662
cml66dlsx000513miz5zih4e0	S-0900	Standard 09:00	09:00	21:00	\N	60	f	t	0	2026-02-03 05:45:48.705	2026-02-03 05:45:48.705
cml66dluc000613miw0vgbha7	S-0800	Standard 08:00	08:00	20:00	\N	60	f	t	0	2026-02-03 05:45:48.757	2026-02-03 05:45:48.757
cml6e2jxp0001iqih3tqemclc	A	บ่อถ่าย จิปาถะ	08:00	17:00	\N	60	f	t	7	2026-02-03 09:21:09.998	2026-02-03 09:21:09.998
cml6e3f2u0003iqih0irtvtu0	B	แม่บ้าน	07:00	17:00	\N	60	f	t	8	2026-02-03 09:21:50.358	2026-02-03 09:21:50.358
cml6e4r7d0005iqihai8hkhn8	C	ศุภชัยกลางคืน	18:00	06:00	\N	60	t	t	9	2026-02-03 09:22:52.729	2026-02-03 09:22:52.729
cml7q816x0000w66jefyem7i4	CAFE	กะร้านกาแฟ	07:00	17:00	\N	60	f	t	10	2026-02-04 07:49:07.209	2026-02-04 07:49:07.209
cml8xjvvq0000lmhqlfjxjjjz	OIL_WD	กะบ่อถ่าย จันทร์-เสาร์ (08:00-17:00)	08:00	17:00	\N	60	f	t	110	2026-02-05 04:02:03.686	2026-02-05 04:02:03.686
cml8xjvyd0001lmhqft4j1vq2	OIL_SUN	กะบ่อถ่าย อาทิตย์ (08:00-16:00)	08:00	16:00	\N	60	f	t	111	2026-02-05 04:02:03.782	2026-02-05 04:02:03.782
cmlaedp0q00013u1cyzjfudkd	SPCS	เสมียนกะดึก	22:00	07:00	\N	60	t	t	13	2026-02-06 04:40:54.507	2026-02-06 04:40:54.507
\.


--
-- Data for Name: ShiftAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShiftAssignment" (id, "userId", "shiftId", date, "isDayOff", "createdAt") FROM stdin;
cml66dlvp000813miftj7exs6	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-01-31 17:00:00	f	2026-02-03 05:45:48.803
cml66dlya000a13miwgd3nvmu	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-01-31 17:00:00	f	2026-02-03 05:45:48.898
cml66dlzi000c13mixf769omo	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-01-31 17:00:00	f	2026-02-03 05:45:48.942
cmlaivheb000134n0boh67lpu	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-01-31 00:00:00	f	2026-02-06 06:46:42.9
cml66dm36000i13mirnz9xw5a	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-01-31 17:00:00	f	2026-02-03 05:45:49.074
cml66dm4b000k13mimpv4mcjx	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-01-31 17:00:00	f	2026-02-03 05:45:49.116
cml66dm5l000m13mi9l6qzr01	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-01 17:00:00	f	2026-02-03 05:45:49.161
cml66dm6v000o13mi5kofgnd6	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-01 17:00:00	f	2026-02-03 05:45:49.207
cml66dm7z000q13miq5ynw5wo	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-01 17:00:00	f	2026-02-03 05:45:49.248
cml66dmai000u13micun2os42	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-01 17:00:00	f	2026-02-03 05:45:49.338
cml66dmbo000w13mix3nwso3z	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-01 17:00:00	f	2026-02-03 05:45:49.38
cml66dmct000y13mix1px3mlt	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-01 17:00:00	f	2026-02-03 05:45:49.421
cml66dmdz001013midaab2n9l	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-02 17:00:00	f	2026-02-03 05:45:49.464
cml66dmf6001213mi55r734tc	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-02 17:00:00	f	2026-02-03 05:45:49.506
cml66dmge001413mi509rr3ez	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-02 17:00:00	f	2026-02-03 05:45:49.551
cml66dmho001613miz2ak9mjr	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-02 17:00:00	f	2026-02-03 05:45:49.596
cml66dmiy001813minvcf3iy1	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-02 17:00:00	f	2026-02-03 05:45:49.642
cml66dmk2001a13mi4slf8bgj	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-02 17:00:00	f	2026-02-03 05:45:49.682
cml66dml8001c13mioj28a80s	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-03 17:00:00	f	2026-02-03 05:45:49.725
cml66dmmi001e13mizfjl7ct5	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-03 17:00:00	f	2026-02-03 05:45:49.77
cml66dmnr001g13mi6alp9h41	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-03 17:00:00	f	2026-02-03 05:45:49.815
cml66dmr9001m13mihwfcmlfe	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-03 17:00:00	f	2026-02-03 05:45:49.942
cml66dmsf001o13miogkjvn9b	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-03 17:00:00	f	2026-02-03 05:45:49.983
cml66dmtn001q13miuhk8gar2	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-04 17:00:00	f	2026-02-03 05:45:50.028
cml66dmus001s13mii00ory7n	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-04 17:00:00	f	2026-02-03 05:45:50.069
cml66dmvy001u13mi4hytpllm	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-04 17:00:00	f	2026-02-03 05:45:50.111
cml66dmzl002013micpozkhwg	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-04 17:00:00	f	2026-02-03 05:45:50.242
cml66dn0r002213miwepg7g5t	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-04 17:00:00	f	2026-02-03 05:45:50.284
cml66dn1y002413miysupylyh	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-05 17:00:00	f	2026-02-03 05:45:50.327
cml66dn37002613mil78d3jt8	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-05 17:00:00	f	2026-02-03 05:45:50.372
cml66dn4d002813mi1rmuf9tp	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-05 17:00:00	f	2026-02-03 05:45:50.414
cml66dn7y002e13mivpi2c35j	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-05 17:00:00	f	2026-02-03 05:45:50.542
cml66dn94002g13mi0973ua2h	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-05 17:00:00	f	2026-02-03 05:45:50.584
cml66dnab002i13mieg68jxus	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-06 17:00:00	f	2026-02-03 05:45:50.627
cml66dnbn002k13mif94imb3l	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-06 17:00:00	f	2026-02-03 05:45:50.676
cml66dnct002m13mie1p8nq90	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-06 17:00:00	f	2026-02-03 05:45:50.718
cml66dngj002s13min0sgd0bu	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-06 17:00:00	f	2026-02-03 05:45:50.851
cml66dnhz002u13miiqfanpjl	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-06 17:00:00	f	2026-02-03 05:45:50.903
cml66dnj8002w13mifky2xt6h	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-07 17:00:00	f	2026-02-03 05:45:50.948
cml66dnkf002y13mizifaf2fu	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-07 17:00:00	f	2026-02-03 05:45:50.991
cml66dnln003013miqboh244q	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-07 17:00:00	f	2026-02-03 05:45:51.035
cml66dnpi003613miyvw1nkgi	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-07 17:00:00	f	2026-02-03 05:45:51.174
cml66dnqo003813mirlhsul98	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-07 17:00:00	f	2026-02-03 05:45:51.217
cml66dnrt003a13mizbatm3v5	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-08 17:00:00	f	2026-02-03 05:45:51.257
cml66dnsy003c13mimjpick6n	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-08 17:00:00	f	2026-02-03 05:45:51.298
cml66dnu6003e13mii0jwqezw	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-08 17:00:00	f	2026-02-03 05:45:51.343
cml66dnwi003i13mi7x41fnp8	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-08 17:00:00	f	2026-02-03 05:45:51.426
cml66dnxp003k13mio57c40ko	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-08 17:00:00	f	2026-02-03 05:45:51.469
cml66dm99000s13mivqkobt9o	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-01 17:00:00	f	2026-02-03 05:45:49.292
cml66dmow001i13miaoayo2vi	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-03 17:00:00	f	2026-02-03 05:45:49.856
cml66dmq4001k13mi551f9807	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-03 17:00:00	f	2026-02-03 05:45:49.901
cml66dmx3001w13miiivrqisd	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-04 17:00:00	f	2026-02-03 05:45:50.151
cml66dmy8001y13mi6rs4gdv0	cml5g1xzx001oua47iy5u23oh	cml8xjvyd0001lmhqft4j1vq2	2026-02-04 17:00:00	f	2026-02-03 05:45:50.192
cml66dn5m002a13migmbmtexj	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-05 17:00:00	f	2026-02-03 05:45:50.458
cml66dn6q002c13mix6kkgd9f	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-05 17:00:00	f	2026-02-03 05:45:50.498
cml66dne6002o13mi22qdfyit	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-06 17:00:00	f	2026-02-03 05:45:50.766
cml66dnfd002q13mi8eo8o44p	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-06 17:00:00	f	2026-02-03 05:45:50.809
cml66dnmx003213miexk7ocwg	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-07 17:00:00	f	2026-02-03 05:45:51.081
cml66dno2003413mijm6wm6jk	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-07 17:00:00	f	2026-02-03 05:45:51.122
cml66dnva003g13miw53rdz20	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-08 17:00:00	f	2026-02-03 05:45:51.382
cml66dnyx003m13midt6zg2tu	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-08 17:00:00	f	2026-02-03 05:45:51.514
cml66do06003o13miss748l7o	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-09 17:00:00	f	2026-02-03 05:45:51.558
cml66do1n003q13mile7xnguq	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-09 17:00:00	f	2026-02-03 05:45:51.611
cml66do2v003s13miuztczpi5	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-09 17:00:00	f	2026-02-03 05:45:51.655
cml66do41003u13milv18xag8	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-09 17:00:00	f	2026-02-03 05:45:51.697
cml66do55003w13mij2hxn59i	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-09 17:00:00	f	2026-02-03 05:45:51.738
cml66do6d003y13miyftx0xrw	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-09 17:00:00	f	2026-02-03 05:45:51.781
cml66do7l004013mi637hhiiy	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-10 17:00:00	f	2026-02-03 05:45:51.825
cml66do8u004213milwj2wapa	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-10 17:00:00	f	2026-02-03 05:45:51.87
cml66doa2004413miyfbgljes	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-10 17:00:00	f	2026-02-03 05:45:51.914
cmlaivhk3000334n0czhsmbpf	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-02 00:00:00	f	2026-02-06 06:46:42.9
cml66dodw004a13miztempgmx	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-10 17:00:00	f	2026-02-03 05:45:52.052
cml66dof4004c13mibmbf2gcv	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-10 17:00:00	f	2026-02-03 05:45:52.096
cml66dogg004e13mi1ayzdqbb	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-11 17:00:00	f	2026-02-03 05:45:52.144
cml66dohy004g13mixmy6480o	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-11 17:00:00	f	2026-02-03 05:45:52.198
cml66doj3004i13miyzktgcsu	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-11 17:00:00	f	2026-02-03 05:45:52.239
cml66domx004o13mijb0jz4bv	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-11 17:00:00	f	2026-02-03 05:45:52.377
cml66doo1004q13mit5qs370g	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-11 17:00:00	f	2026-02-03 05:45:52.417
cml66dop8004s13middd7adno	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-12 17:00:00	f	2026-02-03 05:45:52.46
cml66doqc004u13mi66k33qf9	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-12 17:00:00	f	2026-02-03 05:45:52.5
cml66dorv004w13miczl40ygg	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-12 17:00:00	f	2026-02-03 05:45:52.555
cml66dovi005213mig319k26j	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-12 17:00:00	f	2026-02-03 05:45:52.686
cml66dowt005413mitboiolft	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-12 17:00:00	f	2026-02-03 05:45:52.733
cml66doxy005613mi1zlomgrc	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-13 17:00:00	f	2026-02-03 05:45:52.774
cml66doz1005813miof5ttap8	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-13 17:00:00	f	2026-02-03 05:45:52.814
cml66dp06005a13mis180f1fl	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-13 17:00:00	f	2026-02-03 05:45:52.854
cml66dp3l005g13mipjpic4ws	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-13 17:00:00	f	2026-02-03 05:45:52.977
cml66dp4p005i13mim8u3f3jx	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-13 17:00:00	f	2026-02-03 05:45:53.017
cml66dp5s005k13mii0ypcya3	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-14 17:00:00	f	2026-02-03 05:45:53.057
cml66dp6x005m13miucgwdka5	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-14 17:00:00	f	2026-02-03 05:45:53.097
cml66dp81005o13mi7y0dl9sf	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-14 17:00:00	f	2026-02-03 05:45:53.138
cml66dpbp005u13mijgz04zrl	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-14 17:00:00	f	2026-02-03 05:45:53.269
cml66dpcw005w13mixt1s45qm	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-14 17:00:00	f	2026-02-03 05:45:53.312
cml66dpe1005y13mi2ad3wuih	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-15 17:00:00	f	2026-02-03 05:45:53.354
cml66dpf6006013mi84q2goxw	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-15 17:00:00	f	2026-02-03 05:45:53.394
cml66dpgc006213mi5fgfd52x	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-15 17:00:00	f	2026-02-03 05:45:53.436
cml66dpip006613mifxr6o2xm	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-15 17:00:00	f	2026-02-03 05:45:53.521
cml66dpk3006813miqxhi69pq	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-15 17:00:00	f	2026-02-03 05:45:53.572
cml66dpla006a13migw2orej5	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-15 17:00:00	f	2026-02-03 05:45:53.614
cml66dpmg006c13mir9n8iut5	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-16 17:00:00	f	2026-02-03 05:45:53.656
cml66dpnl006e13migfu6773t	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-16 17:00:00	f	2026-02-03 05:45:53.698
cml66dpou006g13mi4lcb2k7z	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-16 17:00:00	f	2026-02-03 05:45:53.742
cml66dppz006i13mio73t4qfc	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-16 17:00:00	f	2026-02-03 05:45:53.783
cml66dpre006k13miqfsizu74	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-16 17:00:00	f	2026-02-03 05:45:53.834
cml66dpsj006m13mi0ud26xpm	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-16 17:00:00	f	2026-02-03 05:45:53.875
cml66dpto006o13mila1hkavt	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-17 17:00:00	f	2026-02-03 05:45:53.916
cml66dpuw006q13mi2yb61z1t	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-17 17:00:00	f	2026-02-03 05:45:53.961
cml66dpw6006s13mi1ilkp6nx	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-17 17:00:00	f	2026-02-03 05:45:54.006
cml66dpzl006y13mit2sanmev	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-17 17:00:00	f	2026-02-03 05:45:54.129
cml66docp004813mihw5jx2fc	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-10 17:00:00	f	2026-02-03 05:45:52.009
cml66doka004k13mimnq963oq	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-11 17:00:00	f	2026-02-03 05:45:52.282
cml66doli004m13mi7t960012	cml5g1xzx001oua47iy5u23oh	cml8xjvyd0001lmhqft4j1vq2	2026-02-11 17:00:00	f	2026-02-03 05:45:52.326
cml66dot2004y13michr064jn	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-12 17:00:00	f	2026-02-03 05:45:52.599
cml66doud005013mia865uaas	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-12 17:00:00	f	2026-02-03 05:45:52.645
cml66dp1b005c13mignys4zbr	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-13 17:00:00	f	2026-02-03 05:45:52.895
cml66dp2h005e13mit3905a2u	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-13 17:00:00	f	2026-02-03 05:45:52.937
cml66dp98005q13miwsb5zjh6	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-14 17:00:00	f	2026-02-03 05:45:53.18
cml66dpad005s13mibdibs6nm	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-14 17:00:00	f	2026-02-03 05:45:53.221
cml66dphg006413mivlonltje	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-15 17:00:00	f	2026-02-03 05:45:53.476
cml66dpxc006u13misj822hk0	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-17 17:00:00	f	2026-02-03 05:45:54.048
cml66dpyh006w13mitbs5hxc6	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-17 17:00:00	f	2026-02-03 05:45:54.089
cml66dq0p007013miynjow012	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-17 17:00:00	f	2026-02-03 05:45:54.169
cml66dq27007213misetmkmq5	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-18 17:00:00	f	2026-02-03 05:45:54.224
cml66dq3d007413mi9qdxyu98	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-18 17:00:00	f	2026-02-03 05:45:54.265
cml66dq4o007613miw5ngyb8f	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-18 17:00:00	f	2026-02-03 05:45:54.313
cmlaivhk6000534n0f6ld1c4v	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-01 00:00:00	f	2026-02-06 06:46:42.9
cml66dq8j007c13miw78k58ox	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-18 17:00:00	f	2026-02-03 05:45:54.452
cml66dq9o007e13mixw8oyzkp	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-18 17:00:00	f	2026-02-03 05:45:54.492
cml66dqau007g13mi1bb0fuzk	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-19 17:00:00	f	2026-02-03 05:45:54.534
cml66dqc1007i13mihunr0zzc	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-19 17:00:00	f	2026-02-03 05:45:54.578
cml66dqd8007k13migvbmg5ek	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-19 17:00:00	f	2026-02-03 05:45:54.62
cml66dqgp007q13miy35niwns	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-19 17:00:00	f	2026-02-03 05:45:54.745
cml66dqi0007s13mibtefiwtn	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-19 17:00:00	f	2026-02-03 05:45:54.793
cml66dqj5007u13mi9sew9u24	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-20 17:00:00	f	2026-02-03 05:45:54.833
cml66dqkb007w13mivapiaec6	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-20 17:00:00	f	2026-02-03 05:45:54.875
cml66dqlm007y13mil1pnm9e0	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-20 17:00:00	f	2026-02-03 05:45:54.922
cml66dqoz008413mij9hla4k1	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-20 17:00:00	f	2026-02-03 05:45:55.043
cml66dqq4008613mibl97wi6x	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-20 17:00:00	f	2026-02-03 05:45:55.084
cml66dqrb008813miluga73bo	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-21 17:00:00	f	2026-02-03 05:45:55.127
cml66dqsj008a13miub2pdz96	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-21 17:00:00	f	2026-02-03 05:45:55.171
cml66dqto008c13mi9r8rmtor	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-21 17:00:00	f	2026-02-03 05:45:55.212
cml66dqxl008i13migzq2n5lb	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-21 17:00:00	f	2026-02-03 05:45:55.353
cml66dqyr008k13miqzq7ft38	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-21 17:00:00	f	2026-02-03 05:45:55.395
cml66dqzx008m13mi9w6h5mxy	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-22 17:00:00	f	2026-02-03 05:45:55.437
cml66dr13008o13mivt573v3n	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-22 17:00:00	f	2026-02-03 05:45:55.479
cml66dr2a008q13mi4hxjb8f4	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-22 17:00:00	f	2026-02-03 05:45:55.522
cml66dr4j008u13mi6mjq2md3	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-22 17:00:00	f	2026-02-03 05:45:55.604
cml66dr5r008w13midhz7mxzh	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-22 17:00:00	f	2026-02-03 05:45:55.648
cml66dr75008y13migtdak24v	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-22 17:00:00	f	2026-02-03 05:45:55.697
cml66dr8c009013miu58yb6fa	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-23 17:00:00	f	2026-02-03 05:45:55.74
cml66dr9j009213millcqb8sg	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-23 17:00:00	f	2026-02-03 05:45:55.783
cml66drap009413mipolagmaj	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-23 17:00:00	f	2026-02-03 05:45:55.825
cml66drbv009613mi24ccj1r8	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-23 17:00:00	f	2026-02-03 05:45:55.867
cml66drd1009813miefe71mcn	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-23 17:00:00	f	2026-02-03 05:45:55.909
cml66drea009a13mikeqw05m7	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-23 17:00:00	f	2026-02-03 05:45:55.954
cml66drff009c13mi6cn34v57	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-24 17:00:00	f	2026-02-03 05:45:55.996
cml66drgl009e13micg72zzcx	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-24 17:00:00	f	2026-02-03 05:45:56.037
cml66drhr009g13midczd9ui3	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-24 17:00:00	f	2026-02-03 05:45:56.079
cml66drl9009m13miooh14gmw	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-24 17:00:00	f	2026-02-03 05:45:56.205
cml66drmf009o13miaxdfrbbo	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-24 17:00:00	f	2026-02-03 05:45:56.247
cml66drnq009q13miou39uom0	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-25 17:00:00	f	2026-02-03 05:45:56.294
cml66drp0009s13mids62p9g0	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-25 17:00:00	f	2026-02-03 05:45:56.34
cml66drq5009u13mirn2e5rfb	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-25 17:00:00	f	2026-02-03 05:45:56.381
cml66drtq00a013mii4xkxlyw	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-25 17:00:00	f	2026-02-03 05:45:56.51
cml66druv00a213mi0zji74us	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-25 17:00:00	f	2026-02-03 05:45:56.551
cml66drw900a413mis647sa46	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-26 17:00:00	f	2026-02-03 05:45:56.601
cml66drxe00a613miewwgkc0m	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-26 17:00:00	f	2026-02-03 05:45:56.643
cml66dryk00a813mip5fpupun	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-26 17:00:00	f	2026-02-03 05:45:56.684
cml66dq79007a13misxx2367g	cml5g1xzx001oua47iy5u23oh	cml8xjvyd0001lmhqft4j1vq2	2026-02-18 17:00:00	f	2026-02-03 05:45:54.405
cml66dqef007m13miue44ki69	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-19 17:00:00	f	2026-02-03 05:45:54.664
cml66dqfl007o13mik7qf2lfq	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-19 17:00:00	f	2026-02-03 05:45:54.705
cml66dqmq008013mi5tlug6ci	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-20 17:00:00	f	2026-02-03 05:45:54.962
cml66dqnu008213mi8yiruq4y	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-20 17:00:00	f	2026-02-03 05:45:55.002
cml66dqv2008e13miq3zp0ag9	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-21 17:00:00	f	2026-02-03 05:45:55.262
cml66dqw9008g13miaoaqsv4z	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-21 17:00:00	f	2026-02-03 05:45:55.305
cml66dr3f008s13mi7gol3e68	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-22 17:00:00	f	2026-02-03 05:45:55.563
cml66driz009i13mih643zo3f	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-24 17:00:00	f	2026-02-03 05:45:56.123
cml66drk4009k13mibwdohnp0	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-24 17:00:00	f	2026-02-03 05:45:56.165
cml66drra009w13mi2o948265	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-25 17:00:00	f	2026-02-03 05:45:56.423
cml66drsg009y13mifzkutehc	cml5g1xzx001oua47iy5u23oh	cml8xjvyd0001lmhqft4j1vq2	2026-02-25 17:00:00	f	2026-02-03 05:45:56.465
cml66drzu00aa13mij71z8o37	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-26 17:00:00	f	2026-02-03 05:45:56.73
cml66ds0y00ac13mimb4iorty	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-26 17:00:00	f	2026-02-03 05:45:56.77
cml66ds2600ae13mici6r5lhf	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-26 17:00:00	f	2026-02-03 05:45:56.814
cml66ds3i00ag13mic6paeusc	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-26 17:00:00	f	2026-02-03 05:45:56.862
cml66ds4o00ai13mibamwk2np	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-27 17:00:00	f	2026-02-03 05:45:56.905
cml66ds5x00ak13miniaj3pm8	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-27 17:00:00	f	2026-02-03 05:45:56.949
cml66ds7600am13miqxux33td	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-27 17:00:00	f	2026-02-03 05:45:56.994
cmlaivhk7000734n02sdeatq8	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-03 00:00:00	f	2026-02-06 06:46:42.9
cml66dsas00as13mihohxfvl6	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-27 17:00:00	f	2026-02-03 05:45:57.124
cml66dsbz00au13miux0nng9p	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-27 17:00:00	f	2026-02-03 05:45:57.167
cml7q81zv0008w66jykstre65	cml5byep0004014m6bu0geabi	cml7q816x0000w66jefyem7i4	2026-02-03 17:00:00	f	2026-02-04 07:49:08.251
cml7q822e000aw66j91v87no9	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-03 17:00:00	f	2026-02-04 07:49:08.343
cml7q823n000cw66jhtdk9qoo	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-03 17:00:00	f	2026-02-04 07:49:08.387
cml7q824u000ew66jitlp4dj9	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-03 17:00:00	f	2026-02-04 07:49:08.431
cml7q8261000gw66jf0zkysjv	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-03 17:00:00	f	2026-02-04 07:49:08.473
cml7z7yxr0001y5qgcluxq4x0	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-24 00:00:00	f	2026-02-04 12:01:00.831
cml7z887g0003y5qga63cf12t	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-04 00:00:00	f	2026-02-04 12:01:12.633
cml85hizc0001iut06ijaes2b	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-01-31 00:00:00	f	2026-02-04 14:56:24.371
cml85hizi0003iut0o0f3miji	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-06 00:00:00	f	2026-02-04 14:56:24.371
cml85hj4t0005iut09ot6wbp2	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-01-31 00:00:00	f	2026-02-04 14:56:24.371
cml85hj570007iut0629lty0l	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-06 00:00:00	f	2026-02-04 14:56:24.371
cml85hjct000biut05ho5laai	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-07 00:00:00	f	2026-02-04 14:56:24.371
cml85hjcw000diut0617af3fx	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-01 00:00:00	f	2026-02-04 14:56:24.371
cml85hjga000fiut05qi5sthn	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-07 00:00:00	f	2026-02-04 14:56:24.371
cml85hjav0009iut0xqvh0kxf	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-01 00:00:00	f	2026-02-04 14:56:24.371
cml85hjgy000hiut06ahg748b	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-02 00:00:00	f	2026-02-04 14:56:24.371
cml85hjip000jiut0p73xym7n	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-08 00:00:00	f	2026-02-04 14:56:24.371
cml85hjiv000liut0242fgzxp	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-02 00:00:00	f	2026-02-04 14:56:24.371
cml85hjm2000niut0o4uyyt6h	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-08 00:00:00	f	2026-02-04 14:56:24.371
cml85hjmj000piut0xn96acf1	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-03 00:00:00	f	2026-02-04 14:56:24.371
cml85hjmv000riut0p5h8uhka	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-09 00:00:00	f	2026-02-04 14:56:24.371
cml85hjom000tiut0ep3u3nad	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-03 00:00:00	f	2026-02-04 14:56:24.372
cml85hjov000viut07d6sxkaq	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-09 00:00:00	f	2026-02-04 14:56:24.372
cml85hjrt000xiut0cusitb9s	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-04 00:00:00	f	2026-02-04 14:56:24.372
cml85hjse000ziut01dwqe1dh	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-10 00:00:00	f	2026-02-04 14:56:24.372
cml85hjsr0011iut0jtztqx3j	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-04 00:00:00	f	2026-02-04 14:56:24.372
cml85hjuj0013iut0yki8pu3y	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-05 00:00:00	f	2026-02-04 14:56:24.372
cml85hjuu0015iut0wnbg2scx	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-05 00:00:00	f	2026-02-04 14:56:24.372
cml85hjxl0017iut0hk29mnhc	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-10 00:00:00	f	2026-02-04 14:56:24.372
cml85hjy90019iut0dj151nh2	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-11 00:00:00	f	2026-02-04 14:56:24.372
cml85hjyo001biut0r9oau5iy	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-19 00:00:00	f	2026-02-04 14:56:24.372
cml85hk0f001diut06pl5bit2	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-11 00:00:00	f	2026-02-04 14:56:24.372
cml85hk0u001fiut0twueq97h	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-12 00:00:00	f	2026-02-04 14:56:24.372
cml85hk3d001hiut01hb01m6z	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-12 00:00:00	f	2026-02-04 14:56:24.372
cml85hk44001jiut02jutzsf7	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-13 00:00:00	f	2026-02-04 14:56:24.372
cml85hk4l001liut01asa0w12	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-20 00:00:00	f	2026-02-04 14:56:24.372
cml85hk6c001niut07eaij5r4	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-13 00:00:00	f	2026-02-04 14:56:24.372
cml85hk6u001piut044e3qws2	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-14 00:00:00	f	2026-02-04 14:56:24.373
cml85hk94001riut0nff64fkw	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-14 00:00:00	f	2026-02-04 14:56:24.373
cml85hk9z001tiut025ksfu07	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-15 00:00:00	f	2026-02-04 14:56:24.373
cml85hkat001viut00c6kc7lo	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-20 00:00:00	f	2026-02-04 14:56:24.373
cml85hkca001xiut0xp74loki	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-15 00:00:00	f	2026-02-04 14:56:24.373
cml85hkcu001ziut0go9esl3i	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-16 00:00:00	f	2026-02-04 14:56:24.373
cml85hkev0021iut02uriym07	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-16 00:00:00	f	2026-02-04 14:56:24.373
cml85hkfu0023iut031qiyil3	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-17 00:00:00	f	2026-02-04 14:56:24.373
cml85hkgp0025iut00t2v3di7	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-21 00:00:00	f	2026-02-04 14:56:24.373
cml85hki70027iut0jryr9ut9	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-17 00:00:00	f	2026-02-04 14:56:24.373
cml85hkiu0029iut0drink2gc	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-18 00:00:00	f	2026-02-04 14:56:24.373
cml85hkkn002biut04ol60cul	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-18 00:00:00	f	2026-02-04 14:56:24.373
cml85hklp002diut0eumiqp7v	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-19 00:00:00	f	2026-02-04 14:56:24.373
cml85hkmm002fiut0rkmbi0zt	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-21 00:00:00	f	2026-02-04 14:56:24.373
cml85hko3002hiut09rp36ugp	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-22 00:00:00	f	2026-02-04 14:56:24.373
cml66ds9n00aq13mi6k7vdrl9	cml5g289u003uua47ulssk26x	cml8xjvyd0001lmhqft4j1vq2	2026-02-27 17:00:00	f	2026-02-03 05:45:57.083
cml85hkot002jiut02zi9u8om	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-22 00:00:00	f	2026-02-04 14:56:24.373
cml85hkqe002liut0l0p6wod9	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-25 00:00:00	f	2026-02-04 14:56:24.374
cml85hkrk002niut05byqbyom	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-23 00:00:00	f	2026-02-04 14:56:24.374
cml85hksj002piut088j6crsq	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-23 00:00:00	f	2026-02-04 14:56:24.374
cml85hku0002riut0hreo7vlb	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-24 00:00:00	f	2026-02-04 14:56:24.374
cml85hkuu002tiut02fdyxap5	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-25 00:00:00	f	2026-02-04 14:56:24.374
cml85hkw6002viut0fzqlyg0x	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-24 00:00:00	f	2026-02-04 14:56:24.374
cml85hkxf002xiut0fsoowkzz	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-27 00:00:00	f	2026-02-04 14:56:24.374
cml85hkyf002ziut04h7uya9x	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-27 00:00:00	f	2026-02-04 14:56:24.374
cml85hkzx0031iut08qr7yemq	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-26 00:00:00	f	2026-02-04 14:56:24.374
cml85hl0u0033iut0m5z5zpk2	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-26 00:00:00	f	2026-02-04 14:56:24.374
cml8xjwem0005lmhqshg6gug1	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-01-31 17:00:00	f	2026-02-05 04:02:04.367
cml8xjwjj0007lmhqfwteyty0	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-01-31 17:00:00	f	2026-02-05 04:02:04.543
cml8xjwlx0009lmhqlcccqc4r	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-01-31 17:00:00	f	2026-02-05 04:02:04.629
cml8xjwoc000blmhqowwm2kh4	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-01 17:00:00	f	2026-02-05 04:02:04.716
cml8xjwqq000dlmhq6knygfyx	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-01 17:00:00	f	2026-02-05 04:02:04.803
cml8xjwt5000flmhq28oyd5nm	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-01 17:00:00	f	2026-02-05 04:02:04.89
cml8xjwvk000hlmhq4n6ytkqx	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-02 17:00:00	f	2026-02-05 04:02:04.977
cml8xjwxy000jlmhq9r6tfxnh	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-02 17:00:00	f	2026-02-05 04:02:05.062
cml8xjx0c000llmhqyimzdxrz	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-02 17:00:00	f	2026-02-05 04:02:05.149
cml8xjx2q000nlmhq4qsa0zt0	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-03 17:00:00	f	2026-02-05 04:02:05.235
cml8xjx56000plmhq7pt40vrc	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-03 17:00:00	f	2026-02-05 04:02:05.322
cml8xjx7n000rlmhq26i3mlne	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-03 17:00:00	f	2026-02-05 04:02:05.411
cml8xjxa2000tlmhqi2ysp7mi	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-04 17:00:00	f	2026-02-05 04:02:05.498
cml8xjxcf000vlmhq08xxpsx8	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-04 17:00:00	f	2026-02-05 04:02:05.583
cml8xjxet000xlmhqnkh715m2	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-04 17:00:00	f	2026-02-05 04:02:05.67
cml8xjxh9000zlmhqobgygbfu	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-05 17:00:00	f	2026-02-05 04:02:05.757
cml8xjxjo0011lmhqj4j7nnxx	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-05 17:00:00	f	2026-02-05 04:02:05.844
cml8xjxm30013lmhq7b6djcme	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-05 17:00:00	f	2026-02-05 04:02:05.932
cml8xjxoi0015lmhqwlh8dklo	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-06 17:00:00	f	2026-02-05 04:02:06.018
cml8xjxqz0017lmhqzfd9jmz5	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-06 17:00:00	f	2026-02-05 04:02:06.107
cml8xjxth0019lmhqduogikg0	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-06 17:00:00	f	2026-02-05 04:02:06.198
cml8xjxw3001blmhqwcn44t7k	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-02-07 17:00:00	f	2026-02-05 04:02:06.291
cml8xjxyp001dlmhqgntjq0wf	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-02-07 17:00:00	f	2026-02-05 04:02:06.386
cml8xjy1h001flmhqphkgslgm	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-02-07 17:00:00	f	2026-02-05 04:02:06.486
cml8xjy3y001hlmhq62sdlf0h	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-08 17:00:00	f	2026-02-05 04:02:06.575
cml8xjy6g001jlmhqu74adjsg	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-08 17:00:00	f	2026-02-05 04:02:06.665
cml8xjy92001llmhqhrz2mmre	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-08 17:00:00	f	2026-02-05 04:02:06.758
cml8xjybs001nlmhqdwenlxb1	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-09 17:00:00	f	2026-02-05 04:02:06.857
cml8xjyeb001plmhqlqiuw9r1	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-09 17:00:00	f	2026-02-05 04:02:06.947
cml8xjygu001rlmhq51gc2cor	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-09 17:00:00	f	2026-02-05 04:02:07.038
cml8xjyjn001tlmhqilbthd90	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-10 17:00:00	f	2026-02-05 04:02:07.139
cml8xjym2001vlmhqmnvld96o	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-10 17:00:00	f	2026-02-05 04:02:07.226
cml8xjyoq001xlmhqp02ndqvx	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-10 17:00:00	f	2026-02-05 04:02:07.322
cml8xjyrf001zlmhqezkcpr6a	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-11 17:00:00	f	2026-02-05 04:02:07.42
cml8xjytx0021lmhq30new1gl	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-11 17:00:00	f	2026-02-05 04:02:07.509
cml8xjywk0023lmhqna5k0j4a	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-11 17:00:00	f	2026-02-05 04:02:07.604
cml8xjyz60025lmhq26nyx9hn	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-12 17:00:00	f	2026-02-05 04:02:07.699
cml8xjz1l0027lmhq21dj1kgw	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-12 17:00:00	f	2026-02-05 04:02:07.786
cml8xjz480029lmhqai91hj8t	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-12 17:00:00	f	2026-02-05 04:02:07.88
cml8xjz6y002blmhqmipgn8cu	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-13 17:00:00	f	2026-02-05 04:02:07.979
cml8xjz9e002dlmhqsq8pqfos	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-13 17:00:00	f	2026-02-05 04:02:08.066
cml8xjzbt002flmhqp0a6frbn	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-13 17:00:00	f	2026-02-05 04:02:08.154
cml8xjze9002hlmhq9pf12zxu	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-02-14 17:00:00	f	2026-02-05 04:02:08.242
cml8xjzgt002jlmhq7miqzoif	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-02-14 17:00:00	f	2026-02-05 04:02:08.333
cml8xjzj7002llmhqsge238sz	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-02-14 17:00:00	f	2026-02-05 04:02:08.419
cml8xjzlm002nlmhqtr8tvzse	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-15 17:00:00	f	2026-02-05 04:02:08.507
cml8xjzo0002plmhq0tj2z21t	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-15 17:00:00	f	2026-02-05 04:02:08.593
cml8xjzqe002rlmhqfcy9611a	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-15 17:00:00	f	2026-02-05 04:02:08.678
cml8xjzst002tlmhq075asx02	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-16 17:00:00	f	2026-02-05 04:02:08.765
cml8xjzv7002vlmhqf5dl46of	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-16 17:00:00	f	2026-02-05 04:02:08.851
cml8xjzxn002xlmhq13zcck84	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-16 17:00:00	f	2026-02-05 04:02:08.94
cml8xk005002zlmhqdqep6ydm	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-17 17:00:00	f	2026-02-05 04:02:09.03
cml8xk02m0031lmhqt9n5ov32	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-17 17:00:00	f	2026-02-05 04:02:09.118
cml8xk05h0033lmhq95r57rho	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-17 17:00:00	f	2026-02-05 04:02:09.221
cml8xk07w0035lmhqrrqklef5	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-18 17:00:00	f	2026-02-05 04:02:09.309
cml8xk0aa0037lmhqfvy9x6w5	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-18 17:00:00	f	2026-02-05 04:02:09.394
cml8xk0co0039lmhqibckm61q	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-18 17:00:00	f	2026-02-05 04:02:09.48
cml8xk0f2003blmhq7arhh4rh	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-19 17:00:00	f	2026-02-05 04:02:09.566
cml8xk0hh003dlmhqhmn4yhm9	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-19 17:00:00	f	2026-02-05 04:02:09.653
cml8xk0jv003flmhqd0lhrh0b	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-19 17:00:00	f	2026-02-05 04:02:09.739
cml8xk0m9003hlmhqievlce4h	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-20 17:00:00	f	2026-02-05 04:02:09.826
cml8xk0on003jlmhqf8pbdg8k	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-20 17:00:00	f	2026-02-05 04:02:09.911
cml8xk0r2003llmhq5vxfq0mo	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-20 17:00:00	f	2026-02-05 04:02:09.999
cml8xk0tk003nlmhq2vh55ttf	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-02-21 17:00:00	f	2026-02-05 04:02:10.088
cml8xk0vy003plmhqu62aywe2	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-02-21 17:00:00	f	2026-02-05 04:02:10.174
cml8xk0yd003rlmhq837ze9eo	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-02-21 17:00:00	f	2026-02-05 04:02:10.261
cml8xk10s003tlmhq9z9bgl2r	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-22 17:00:00	f	2026-02-05 04:02:10.348
cml8xk136003vlmhqguof4f6c	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-22 17:00:00	f	2026-02-05 04:02:10.434
cml8xk15m003xlmhqg5qxz6pd	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-22 17:00:00	f	2026-02-05 04:02:10.522
cml8xk17z003zlmhqcqi95gjq	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-23 17:00:00	f	2026-02-05 04:02:10.607
cml8xk1ad0041lmhqvsvy2wff	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-23 17:00:00	f	2026-02-05 04:02:10.694
cml8xk1ct0043lmhqqjg0imcn	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-23 17:00:00	f	2026-02-05 04:02:10.781
cml8xk1f70045lmhq14qbykpn	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-24 17:00:00	f	2026-02-05 04:02:10.868
cml8xk1hl0047lmhq1xymr3g3	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-24 17:00:00	f	2026-02-05 04:02:10.954
cml8xk1k90049lmhqoo7revao	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-24 17:00:00	f	2026-02-05 04:02:11.049
cml8xk1mo004blmhqn0eyeu4z	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-25 17:00:00	f	2026-02-05 04:02:11.136
cml8xk1p3004dlmhqfc1qesrh	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-25 17:00:00	f	2026-02-05 04:02:11.224
cml8xk1rj004flmhqfdn4ijg5	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-25 17:00:00	f	2026-02-05 04:02:11.311
cml8xk1tw004hlmhq8s8hdbgj	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-26 17:00:00	f	2026-02-05 04:02:11.397
cml8xk1wa004jlmhq1pbqjwyi	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-26 17:00:00	f	2026-02-05 04:02:11.482
cml8xk1yp004llmhqp0bnsyjm	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-26 17:00:00	f	2026-02-05 04:02:11.569
cml8xk211004nlmhqo4kev762	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-02-27 17:00:00	f	2026-02-05 04:02:11.654
cml8xk23g004plmhqktotlwnb	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-02-27 17:00:00	f	2026-02-05 04:02:11.741
cml8xk25u004rlmhq4zjd91w2	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-02-27 17:00:00	f	2026-02-05 04:02:11.827
cml8xk28a004tlmhq7i51zpla	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-02-28 17:00:00	f	2026-02-05 04:02:11.914
cml8xk2ao004vlmhqj87zgvwk	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-02-28 17:00:00	f	2026-02-05 04:02:12.001
cml8xk2d3004xlmhqm32pjx1y	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-02-28 17:00:00	f	2026-02-05 04:02:12.087
cml8xk2fh004zlmhqd5eqm8ly	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-01 17:00:00	f	2026-02-05 04:02:12.174
cml8xk2hu0051lmhqaquc6b5n	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-01 17:00:00	f	2026-02-05 04:02:12.259
cml8xk2k80053lmhqxkhvwjjv	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-01 17:00:00	f	2026-02-05 04:02:12.345
cml8xk2mn0055lmhqyzyzgh5c	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-02 17:00:00	f	2026-02-05 04:02:12.431
cml8xk2p00057lmhqpf2ceed8	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-02 17:00:00	f	2026-02-05 04:02:12.517
cml8xk2rf0059lmhqvyrlfwgs	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-02 17:00:00	f	2026-02-05 04:02:12.603
cml8xk2tu005blmhqeo7whnk8	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-03 17:00:00	f	2026-02-05 04:02:12.69
cml8xk2w7005dlmhqh3kss2nq	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-03 17:00:00	f	2026-02-05 04:02:12.776
cml8xk2yn005flmhqjhkz9y8h	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-03 17:00:00	f	2026-02-05 04:02:12.863
cml8xk314005hlmhqbfrzvujk	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-04 17:00:00	f	2026-02-05 04:02:12.952
cml8xk33v005jlmhqh570zhba	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-04 17:00:00	f	2026-02-05 04:02:13.051
cml8xk368005llmhqkknvt19s	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-04 17:00:00	f	2026-02-05 04:02:13.137
cml8xk38n005nlmhqy3r7pxpw	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-05 17:00:00	f	2026-02-05 04:02:13.224
cml8xk3b2005plmhqaz1ztgc1	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-05 17:00:00	f	2026-02-05 04:02:13.31
cml8xk3dk005rlmhqdctf2euv	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-05 17:00:00	f	2026-02-05 04:02:13.401
cml8xk3fy005tlmhqbf0xka17	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-06 17:00:00	f	2026-02-05 04:02:13.487
cml8xk3id005vlmhqiocaarzz	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-06 17:00:00	f	2026-02-05 04:02:13.573
cml8xk3kr005xlmhqa5m4e6pg	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-06 17:00:00	f	2026-02-05 04:02:13.659
cml8xk3n5005zlmhq7kd0xhlt	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-03-07 17:00:00	f	2026-02-05 04:02:13.746
cml8xk3pk0061lmhqg8zytkry	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-03-07 17:00:00	f	2026-02-05 04:02:13.832
cml8xk3rz0063lmhqtquz4zom	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-03-07 17:00:00	f	2026-02-05 04:02:13.92
cml8xk3ue0065lmhqszcb8ku2	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-08 17:00:00	f	2026-02-05 04:02:14.006
cml8xk3wt0067lmhq9zc2ersc	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-08 17:00:00	f	2026-02-05 04:02:14.094
cml8xk3z70069lmhq9n2r56el	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-08 17:00:00	f	2026-02-05 04:02:14.179
cml8xk41m006blmhqweuh94jq	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-09 17:00:00	f	2026-02-05 04:02:14.266
cml8xk441006dlmhqxar1ujih	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-09 17:00:00	f	2026-02-05 04:02:14.354
cml8xk46g006flmhqwhuxrc5i	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-09 17:00:00	f	2026-02-05 04:02:14.44
cml8xk48u006hlmhq4eohk1jg	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-10 17:00:00	f	2026-02-05 04:02:14.527
cml8xk4b7006jlmhq2kcvitbv	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-10 17:00:00	f	2026-02-05 04:02:14.612
cml8xk4dm006llmhqzorzee52	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-10 17:00:00	f	2026-02-05 04:02:14.698
cml8xk4g2006nlmhq6wc0g2vk	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-11 17:00:00	f	2026-02-05 04:02:14.786
cml8xk4ii006plmhqqjgo9wuj	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-11 17:00:00	f	2026-02-05 04:02:14.874
cml8xk4kw006rlmhqbtne2chs	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-11 17:00:00	f	2026-02-05 04:02:14.96
cml8xk4n9006tlmhqsoeb9znh	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-12 17:00:00	f	2026-02-05 04:02:15.045
cml8xk4pp006vlmhq5xeed2ae	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-12 17:00:00	f	2026-02-05 04:02:15.133
cml8xk4s5006xlmhqn7qkk672	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-12 17:00:00	f	2026-02-05 04:02:15.221
cml8xk4uj006zlmhq022r0t90	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-13 17:00:00	f	2026-02-05 04:02:15.307
cml8xk4wz0071lmhqus5o195d	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-13 17:00:00	f	2026-02-05 04:02:15.395
cml8xk4ze0073lmhqb3vyp78p	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-13 17:00:00	f	2026-02-05 04:02:15.482
cml8xk51u0075lmhqj4oa3c2r	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-03-14 17:00:00	f	2026-02-05 04:02:15.57
cml8xk54g0077lmhqp97uc1zc	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-03-14 17:00:00	f	2026-02-05 04:02:15.665
cml8xk5780079lmhqk6k3crnm	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-03-14 17:00:00	f	2026-02-05 04:02:15.764
cml8xk59u007blmhqnndczuoa	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-15 17:00:00	f	2026-02-05 04:02:15.858
cml8xk5c8007dlmhq1mft4gyk	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-15 17:00:00	f	2026-02-05 04:02:15.944
cml8xk5eo007flmhqa00vzj7k	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-15 17:00:00	f	2026-02-05 04:02:16.033
cml8xk5h3007hlmhqux9szovd	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-16 17:00:00	f	2026-02-05 04:02:16.119
cml8xk5jl007jlmhqdic8mr9v	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-16 17:00:00	f	2026-02-05 04:02:16.209
cml8xk5m1007llmhqrrm9xajz	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-16 17:00:00	f	2026-02-05 04:02:16.298
cml8xk5of007nlmhqrdkvmlkw	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-17 17:00:00	f	2026-02-05 04:02:16.384
cml8xk5qt007plmhqbp2lv73i	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-17 17:00:00	f	2026-02-05 04:02:16.469
cml8xk5t8007rlmhq8x114ruu	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-17 17:00:00	f	2026-02-05 04:02:16.556
cml8xk5vm007tlmhqau3cr9sr	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-18 17:00:00	f	2026-02-05 04:02:16.643
cml8xk5y2007vlmhqj1f2u3vu	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-18 17:00:00	f	2026-02-05 04:02:16.73
cml8xk60h007xlmhqbv3eg6eb	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-18 17:00:00	f	2026-02-05 04:02:16.817
cml8xk62w007zlmhqgcff3irp	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-19 17:00:00	f	2026-02-05 04:02:16.904
cml8xk6590081lmhquq4ao6oj	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-19 17:00:00	f	2026-02-05 04:02:16.99
cml8xk67p0083lmhqmbhjddmz	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-19 17:00:00	f	2026-02-05 04:02:17.078
cml8xk6a30085lmhq1g2305ev	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-20 17:00:00	f	2026-02-05 04:02:17.164
cml8xk6ci0087lmhqujesdnbp	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-20 17:00:00	f	2026-02-05 04:02:17.251
cml8xk6ex0089lmhq8h53ngys	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-20 17:00:00	f	2026-02-05 04:02:17.337
cml8xk6hc008blmhqxf1wqt59	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-03-21 17:00:00	f	2026-02-05 04:02:17.424
cml8xk6js008dlmhqysuestyo	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-03-21 17:00:00	f	2026-02-05 04:02:17.513
cml8xk6m8008flmhq0bhzueid	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-03-21 17:00:00	f	2026-02-05 04:02:17.6
cml8xk6om008hlmhqa03h7n7a	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-22 17:00:00	f	2026-02-05 04:02:17.686
cml8xk6r2008jlmhqxqsetjen	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-22 17:00:00	f	2026-02-05 04:02:17.775
cml8xk6u9008llmhqdno0c2tp	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-22 17:00:00	f	2026-02-05 04:02:17.889
cml8xk6wm008nlmhqrufhrcnx	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-23 17:00:00	f	2026-02-05 04:02:17.974
cml8xk6z0008plmhqaizmqogd	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-23 17:00:00	f	2026-02-05 04:02:18.06
cml8xk71g008rlmhqhvzo089g	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-23 17:00:00	f	2026-02-05 04:02:18.148
cml8xk73t008tlmhq7p816rfp	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-24 17:00:00	f	2026-02-05 04:02:18.234
cml8xk76a008vlmhqp578a7do	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-24 17:00:00	f	2026-02-05 04:02:18.322
cml8xk796008xlmhqafdao34a	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-24 17:00:00	f	2026-02-05 04:02:18.426
cml8xk7bm008zlmhqsuoy6ni9	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-25 17:00:00	f	2026-02-05 04:02:18.514
cml8xk7e00091lmhq0lcyj8d5	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-25 17:00:00	f	2026-02-05 04:02:18.601
cml8xk7hl0093lmhqrzloztl5	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-25 17:00:00	f	2026-02-05 04:02:18.687
cml8xk7k00095lmhq3a0ri7y9	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-26 17:00:00	f	2026-02-05 04:02:18.816
cml8xk7mc0097lmhqftx2qmzx	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-26 17:00:00	f	2026-02-05 04:02:18.901
cml8xk7or0099lmhqsr4y1m66	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-26 17:00:00	f	2026-02-05 04:02:18.987
cml8xk7r4009blmhq7ifzykof	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-27 17:00:00	f	2026-02-05 04:02:19.072
cml8xk7th009dlmhqcgvwwm3u	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-27 17:00:00	f	2026-02-05 04:02:19.158
cml8xk7vw009flmhq4f073kgz	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-27 17:00:00	f	2026-02-05 04:02:19.245
cml8xk7yc009hlmhqvfuypk5p	cml5waf57000114p7u4pb0j1l	cml8xjvyd0001lmhqft4j1vq2	2026-03-28 17:00:00	f	2026-02-05 04:02:19.332
cml8xk80q009jlmhqrhnoihzm	cml6ctvsk001nuqrgooayfxde	cml8xjvyd0001lmhqft4j1vq2	2026-03-28 17:00:00	f	2026-02-05 04:02:19.419
cml8xk835009llmhqqz5wreuh	cml6ctvrh001luqrg60imh1k9	cml8xjvyd0001lmhqft4j1vq2	2026-03-28 17:00:00	f	2026-02-05 04:02:19.505
cml8xk85i009nlmhqyleejyzb	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-29 17:00:00	f	2026-02-05 04:02:19.59
cml8xk87x009plmhqpdq4hmdc	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-29 17:00:00	f	2026-02-05 04:02:19.677
cml8xk8ac009rlmhqymd36m7p	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-29 17:00:00	f	2026-02-05 04:02:19.764
cml8xk8cp009tlmhqps2fdn6n	cml5waf57000114p7u4pb0j1l	cml8xjvvq0000lmhqlfjxjjjz	2026-03-30 17:00:00	f	2026-02-05 04:02:19.849
cml8xk8f2009vlmhqozkwhgvs	cml6ctvsk001nuqrgooayfxde	cml8xjvvq0000lmhqlfjxjjjz	2026-03-30 17:00:00	f	2026-02-05 04:02:19.935
cml8xk8hi009xlmhqhqeyquak	cml6ctvrh001luqrg60imh1k9	cml8xjvvq0000lmhqlfjxjjjz	2026-03-30 17:00:00	f	2026-02-05 04:02:20.022
cml94je0x00012urqsvh886nt	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-06 17:00:00	f	2026-02-05 07:17:37.857
cml94jeda00032urq9hrdiiyx	cml5g1qzg000iua472zcpgugd	cml66dlno000113mih77suyuc	2026-02-13 17:00:00	f	2026-02-05 07:17:38.302
cml94jemq00052urqa8zr056y	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-03 17:00:00	f	2026-02-05 07:17:38.642
cml94jexo00072urqs23i7e98	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-10 17:00:00	f	2026-02-05 07:17:39.037
cml94jf8o00092urqjipkbrpj	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-01-31 17:00:00	f	2026-02-05 07:17:39.432
cml94jfb5000b2urqz1088owh	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-01 17:00:00	f	2026-02-05 07:17:39.521
cml94jfdh000d2urqn7ql0s9y	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-02 17:00:00	f	2026-02-05 07:17:39.605
cml94jfgx000f2urqsxv0lnpt	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-04 17:00:00	f	2026-02-05 07:17:39.73
cml94jfky000h2urq8utgazha	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-05 17:00:00	f	2026-02-05 07:17:39.874
cml94jfnd000j2urq6id4xoh7	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-06 17:00:00	f	2026-02-05 07:17:39.961
cml94jfpp000l2urqhr1tng2m	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-07 17:00:00	f	2026-02-05 07:17:40.045
cml94jfs2000n2urqzrrqbbgj	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-08 17:00:00	f	2026-02-05 07:17:40.13
cml94jfuc000p2urqn3bo7tqk	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-09 17:00:00	f	2026-02-05 07:17:40.212
cml94jfye000r2urqnkeox584	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-10 17:00:00	f	2026-02-05 07:17:40.358
cml94jg0q000t2urq9akhohbp	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-11 17:00:00	f	2026-02-05 07:17:40.443
cml94jg34000v2urqtlpo9q3n	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-12 17:00:00	f	2026-02-05 07:17:40.528
cml94jg5h000x2urqubl4ovaf	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-13 17:00:00	f	2026-02-05 07:17:40.613
cml94jg7u000z2urqbkehxmdh	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-14 17:00:00	f	2026-02-05 07:17:40.698
cml94jga600112urqbbxinsbs	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-15 17:00:00	f	2026-02-05 07:17:40.783
cml94jge400132urqqzmh2ddw	cml6ctvnx001buqrgfzjexn6r	cml7q816x0000w66jefyem7i4	2026-02-16 17:00:00	f	2026-02-05 07:17:40.924
cml94jgm900152urqvzl9vz47	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-05 17:00:00	f	2026-02-05 07:17:41.218
cml94jgx900172urqm9j13j8j	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-12 17:00:00	f	2026-02-05 07:17:41.613
cml94jh6400192urqkzg6wq3c	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-01-31 17:00:00	f	2026-02-05 07:17:41.932
cml94jh8g001b2urqdky5y30u	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-01 17:00:00	f	2026-02-05 07:17:42.016
cml94jhat001d2urq8mji38si	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-02 17:00:00	f	2026-02-05 07:17:42.101
cml94jhd7001f2urqgarkhns8	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-03 17:00:00	f	2026-02-05 07:17:42.188
cml94jhfi001h2urqbnfr3kjq	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-04 17:00:00	f	2026-02-05 07:17:42.271
cml94jhht001j2urqi1zfsacz	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-05 17:00:00	f	2026-02-05 07:17:42.353
cml94jhlt001l2urqmy5kt8ue	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-06 17:00:00	f	2026-02-05 07:17:42.497
cml94jho5001n2urqbsxrhlls	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-07 17:00:00	f	2026-02-05 07:17:42.581
cml94jhqg001p2urq79pmrehu	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-08 17:00:00	f	2026-02-05 07:17:42.664
cml94jhsq001r2urqbs6p1j9h	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-09 17:00:00	f	2026-02-05 07:17:42.746
cml94jhv1001t2urqoe451wro	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-10 17:00:00	f	2026-02-05 07:17:42.829
cml94jhz7001v2urqneplntcy	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-11 17:00:00	f	2026-02-05 07:17:42.979
cml94ji1k001x2urqmay1s6vq	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-12 17:00:00	f	2026-02-05 07:17:43.065
cml94ji3y001z2urqg4ryfkvm	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-13 17:00:00	f	2026-02-05 07:17:43.15
cml94ji6b00212urqqqvv4qzx	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-14 17:00:00	f	2026-02-05 07:17:43.235
cml94ji8l00232urqttyd4z6e	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-15 17:00:00	f	2026-02-05 07:17:43.317
cml94jiaw00252urqbwtdfozv	cml6ctv5n000fuqrg94t826wg	cml6e4r7d0005iqihai8hkhn8	2026-02-16 17:00:00	f	2026-02-05 07:17:43.401
cml94jijk00272urq6r2bi07w	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-04 17:00:00	f	2026-02-05 07:17:43.712
cml94jiuq00292urqmbqr6yoy	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-11 17:00:00	f	2026-02-05 07:17:44.114
cml94jj3y002b2urqm47w44xs	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-01 17:00:00	f	2026-02-05 07:17:44.447
cml94jjew002d2urqszg1gk6h	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-08 17:00:00	f	2026-02-05 07:17:44.841
cml94jjq8002f2urqwd7i7nqj	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-15 17:00:00	f	2026-02-05 07:17:45.248
cml94jjw2002h2urq8szk15vt	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-02 17:00:00	f	2026-02-05 07:17:45.459
cml94jk75002j2urqkq4fmwob	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-09 17:00:00	f	2026-02-05 07:17:45.857
cml94jki1002l2urqj5xxvwb1	cml5g1orx0004ua47946isqic	cml66dlkw000013mitod5upug	2026-02-16 17:00:00	f	2026-02-05 07:17:46.25
cml94jl7o002n2urqzw5jxbww	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-01-31 17:00:00	f	2026-02-05 07:17:47.173
cml94jla2002p2urqzrzpt87b	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-01 17:00:00	f	2026-02-05 07:17:47.258
cml94jlcd002r2urqx0zlqs5f	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-02 17:00:00	f	2026-02-05 07:17:47.341
cml94jlep002t2urqf0vz7ykq	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-03 17:00:00	f	2026-02-05 07:17:47.426
cml94jlh1002v2urqxipw7kcm	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-04 17:00:00	f	2026-02-05 07:17:47.509
cml94jlje002x2urqxgbnfwcy	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-05 17:00:00	f	2026-02-05 07:17:47.594
cml94jlnd002z2urq7m3jvx8a	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-06 17:00:00	f	2026-02-05 07:17:47.738
cml94jlpo00312urq665kzutm	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-07 17:00:00	f	2026-02-05 07:17:47.82
cml94jlry00332urqy4sr95w4	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-08 17:00:00	f	2026-02-05 07:17:47.903
cml94jlu800352urqwrphgzjp	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-09 17:00:00	f	2026-02-05 07:17:47.985
cml94jlwk00372urqu3pc99wu	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-10 17:00:00	f	2026-02-05 07:17:48.068
cml94jm0u00392urq2lir0ni2	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-11 17:00:00	f	2026-02-05 07:17:48.223
cml94jm35003b2urqueegdw0s	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-12 17:00:00	f	2026-02-05 07:17:48.306
cml94jm5g003d2urqs1h4muqg	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-13 17:00:00	f	2026-02-05 07:17:48.389
cml94jm7s003f2urqktv856nk	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-14 17:00:00	f	2026-02-05 07:17:48.472
cml94jma4003h2urqo4s7bfz2	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-15 17:00:00	f	2026-02-05 07:17:48.557
cml94jmce003j2urqt2p17xa4	cml6ctv4g000duqrgdybgtyte	cml6e4r7d0005iqihai8hkhn8	2026-02-16 17:00:00	f	2026-02-05 07:17:48.638
cml94jmgk003l2urq96506zyp	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-01-31 17:00:00	f	2026-02-05 07:17:48.788
cml94jmix003n2urqjfj3s0ws	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-01 17:00:00	f	2026-02-05 07:17:48.873
cml94jml9003p2urq8pez1p25	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-02 17:00:00	f	2026-02-05 07:17:48.957
cml94jmov003r2urqq6xpuict	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-04 17:00:00	f	2026-02-05 07:17:49.087
cml94jmr7003t2urqsxuivdqx	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-05 17:00:00	f	2026-02-05 07:17:49.171
cml94jmv4003v2urq29z0klpc	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-06 17:00:00	f	2026-02-05 07:17:49.312
cml94jmxh003x2urqo00lni9h	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-07 17:00:00	f	2026-02-05 07:17:49.397
cml94jmzt003z2urqc7wuej1u	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-08 17:00:00	f	2026-02-05 07:17:49.481
cml94jn2400412urq55zy3jjl	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-09 17:00:00	f	2026-02-05 07:17:49.565
cml94jn4p00432urq2xvvtg75	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-10 17:00:00	f	2026-02-05 07:17:49.658
cml94jn9l00452urqreb3xm4a	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-11 17:00:00	f	2026-02-05 07:17:49.833
cml94jnbw00472urquddasjeh	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-12 17:00:00	f	2026-02-05 07:17:49.916
cml94jne700492urq1nkuf0bl	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-13 17:00:00	f	2026-02-05 07:17:50
cml94jngk004b2urqpccsfoqx	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-14 17:00:00	f	2026-02-05 07:17:50.085
cml94jniw004d2urqnnhpowec	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-15 17:00:00	f	2026-02-05 07:17:50.168
cml94jnn4004f2urqo37aoitm	cml6cv8uy000713l7zocqn0fn	cml7q816x0000w66jefyem7i4	2026-02-16 17:00:00	f	2026-02-05 07:17:50.32
cml94jnph004h2urqxgsztnwr	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-01-31 17:00:00	f	2026-02-05 07:17:50.405
cml94jnru004j2urq3hoco7b8	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-01 17:00:00	f	2026-02-05 07:17:50.491
cml94jnu6004l2urqde28rubt	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-02 17:00:00	f	2026-02-05 07:17:50.575
cml94jnxo004n2urq6hk5fg1a	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-04 17:00:00	f	2026-02-05 07:17:50.7
cml94jo1n004p2urqq1h2d4ij	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-05 17:00:00	f	2026-02-05 07:17:50.843
cml94jo40004r2urq4rw67i68	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-06 17:00:00	f	2026-02-05 07:17:50.928
cml94jo6d004t2urqph5bv1t7	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-07 17:00:00	f	2026-02-05 07:17:51.013
cml94jo8n004v2urqf0cp7p89	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-08 17:00:00	f	2026-02-05 07:17:51.095
cml94joax004x2urqwgyv3lfv	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-09 17:00:00	f	2026-02-05 07:17:51.178
cml94jod8004z2urqrn7vnm4j	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-10 17:00:00	f	2026-02-05 07:17:51.261
cml94johd00512urqssiluh0v	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-11 17:00:00	f	2026-02-05 07:17:51.409
cml94jojp00532urq6lneeow7	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-12 17:00:00	f	2026-02-05 07:17:51.494
cml94jom200552urqplon4wau	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-13 17:00:00	f	2026-02-05 07:17:51.578
cml94jood00572urqmgx3qkz6	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-14 17:00:00	f	2026-02-05 07:17:51.661
cml94joqn00592urq4vujws6s	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-15 17:00:00	f	2026-02-05 07:17:51.743
cml94jous005b2urqrv8mrp5b	cml6cv8qd000113l7pz55vip3	cml7q816x0000w66jefyem7i4	2026-02-16 17:00:00	f	2026-02-05 07:17:51.892
cml94jpnv005d2urqevbu1pgw	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-02 17:00:00	f	2026-02-05 07:17:52.939
cml94jpx6005f2urq9gthtzmu	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-09 17:00:00	f	2026-02-05 07:17:53.275
cml94jq9r005h2urqgaux9p1t	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-16 17:00:00	f	2026-02-05 07:17:53.727
cml94jqcd005j2urq9x264cpr	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-01-31 17:00:00	f	2026-02-05 07:17:53.821
cml94jqnu005l2urqa8tgx3i2	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-07 17:00:00	f	2026-02-05 07:17:54.234
cml94jqz2005n2urqshrx4kxb	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-14 17:00:00	f	2026-02-05 07:17:54.638
cml94jrr2005p2urqt351mcy4	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-01-31 17:00:00	f	2026-02-05 07:17:55.647
cml94jrtg005r2urqygzdxw4k	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-01 17:00:00	f	2026-02-05 07:17:55.732
cml94jrvt005t2urq0y6p7k85	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-02 17:00:00	f	2026-02-05 07:17:55.817
cml94jrz7005v2urq9ou8g3jc	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-04 17:00:00	f	2026-02-05 07:17:55.94
cml94js39005x2urqjkpldtqp	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-05 17:00:00	f	2026-02-05 07:17:56.086
cml94js5m005z2urqos5wkfil	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-06 17:00:00	f	2026-02-05 07:17:56.17
cml94js7z00612urqvutgr8lf	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-07 17:00:00	f	2026-02-05 07:17:56.255
cml94jsab00632urq878vhl9y	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-08 17:00:00	f	2026-02-05 07:17:56.339
cml94jscm00652urq7iy16x2b	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-09 17:00:00	f	2026-02-05 07:17:56.422
cml94jsex00672urq1klis7aq	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-10 17:00:00	f	2026-02-05 07:17:56.506
cml94jsj000692urq2huun463	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-11 17:00:00	f	2026-02-05 07:17:56.653
cml94jsld006b2urq29ttm4eh	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-12 17:00:00	f	2026-02-05 07:17:56.737
cml94jsnn006d2urq4hcdgrpf	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-13 17:00:00	f	2026-02-05 07:17:56.819
cml94jsq2006f2urqi7zt8xbi	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-14 17:00:00	f	2026-02-05 07:17:56.907
cml94jssm006h2urq5mhpgtnl	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-15 17:00:00	f	2026-02-05 07:17:56.998
cml94jsuw006j2urqhhhf0uig	cml6ctuwf0001uqrgn7ktp9je	cml7q816x0000w66jefyem7i4	2026-02-16 17:00:00	f	2026-02-05 07:17:57.08
cml94st5o00017d0zompiq1aq	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-01-31 17:00:00	f	2026-02-05 07:24:57.373
cml66dm0r000e13miaeb45376	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-01-31 17:00:00	f	2026-02-03 05:45:48.987
cml94stk900037d0zkdbwhlph	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-01 17:00:00	f	2026-02-05 07:24:57.897
cml94su2400057d0zonue6ord	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-03 17:00:00	f	2026-02-05 07:24:58.54
cml94suek00077d0zra3amcvl	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-04 17:00:00	f	2026-02-05 07:24:58.988
cml94suqj00097d0zquwvrzfa	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-05 17:00:00	f	2026-02-05 07:24:59.42
cml94sv2e000b7d0znab5inxo	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-06 17:00:00	f	2026-02-05 07:24:59.846
cml94sve8000d7d0znsfqlzx0	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-07 17:00:00	f	2026-02-05 07:25:00.272
cml94svq3000f7d0zamxaspu2	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-08 17:00:00	f	2026-02-05 07:25:00.7
cml94sw7t000h7d0zbflwmlui	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-10 17:00:00	f	2026-02-05 07:25:01.337
cml66dob7004613miy3w5uthl	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-10 17:00:00	f	2026-02-03 05:45:51.955
cml94swk6000j7d0zgpewrhzz	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-11 17:00:00	f	2026-02-05 07:25:01.782
cml94sww7000l7d0zwk629ag0	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-12 17:00:00	f	2026-02-05 07:25:02.215
cml94sx88000n7d0zwxwwwx6c	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-13 17:00:00	f	2026-02-05 07:25:02.649
cml94sxk2000p7d0z2r7z5uzs	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-14 17:00:00	f	2026-02-05 07:25:03.074
cml94sxvu000r7d0zk8qazhh1	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-15 17:00:00	f	2026-02-05 07:25:03.498
cml94sydl000t7d0z271pmw07	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-17 17:00:00	f	2026-02-05 07:25:04.138
cml94sypf000v7d0zod5ghm4h	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-18 17:00:00	f	2026-02-05 07:25:04.563
cml66dq5s007813miwtpgwa1t	cml5g1vmh001aua47rlxc2pr1	cml7q816x0000w66jefyem7i4	2026-02-18 17:00:00	f	2026-02-03 05:45:54.353
cml94sz17000x7d0zngqbk05c	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-19 17:00:00	f	2026-02-05 07:25:04.988
cml94szcz000z7d0zq7hbzlac	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-20 17:00:00	f	2026-02-05 07:25:05.412
cml94szpo00117d0zwvy21n90	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-21 17:00:00	f	2026-02-05 07:25:05.868
cml94t01x00137d0zvcan5tnx	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-22 17:00:00	f	2026-02-05 07:25:06.309
cml94t0jg00157d0zawr8x25t	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-24 17:00:00	f	2026-02-05 07:25:06.94
cml94t0v700177d0zgrzlj0p7	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-25 17:00:00	f	2026-02-05 07:25:07.363
cml94t16z00197d0zf9xp72sq	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-26 17:00:00	f	2026-02-05 07:25:07.787
cml94t1ir001b7d0z7kmp23zs	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-27 17:00:00	f	2026-02-05 07:25:08.212
cml66ds8i00ao13mi4iebxj7l	cml5g1xzx001oua47iy5u23oh	cml7q816x0000w66jefyem7i4	2026-02-27 17:00:00	f	2026-02-03 05:45:57.042
cml97kceu0001be3g0plufmr5	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-01 00:00:00	f	2026-02-05 08:42:21.27
cml97kckq0005be3gxyl4rzcv	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-01 00:00:00	f	2026-02-05 08:42:21.483
cmlaivhq5000b34n0jt1364ui	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-05 00:00:00	f	2026-02-06 06:46:42.9
cml97kcyp000hbe3gn80s62c0	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-02 00:00:00	f	2026-02-05 08:42:21.986
cml97kcrp000bbe3gdy8r2yfo	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-01 00:00:00	f	2026-02-05 08:42:21.734
cml97kcu1000dbe3gq3r0nysf	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-01 00:00:00	f	2026-02-05 08:42:21.817
cml97kcwe000fbe3gnrw08n83	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-02 00:00:00	f	2026-02-05 08:42:21.902
cml97kd11000jbe3g4ag4k3sl	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-02 00:00:00	f	2026-02-05 08:42:22.07
cml97kdt50017be3gzfb85gab	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-04 00:00:00	f	2026-02-05 08:42:23.081
cml97kd5q000nbe3g6fulxjo8	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-02 00:00:00	f	2026-02-05 08:42:22.239
cml97kd85000pbe3gx0rw6fhn	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-02 00:00:00	f	2026-02-05 08:42:22.325
cml97kdah000rbe3ghsuq5oee	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-02 00:00:00	f	2026-02-05 08:42:22.41
cml97kdf5000vbe3g2l775e5m	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-03 00:00:00	f	2026-02-05 08:42:22.578
cml97kdhh000xbe3gsnjzmjy8	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-03 00:00:00	f	2026-02-05 08:42:22.662
cml97kdjt000zbe3gusm88ekc	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-03 00:00:00	f	2026-02-05 08:42:22.745
cml97kdm50011be3g569zod11	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-03 00:00:00	f	2026-02-05 08:42:22.829
cml97kdog0013be3glm0i7vge	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-03 00:00:00	f	2026-02-05 08:42:22.912
cml97kdqu0015be3grhjhcf5e	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-04 00:00:00	f	2026-02-05 08:42:22.998
cml97kdvg0019be3g5zy5q19a	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-04 00:00:00	f	2026-02-05 08:42:23.165
cml97kea1001lbe3glgpexln7	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-05 00:00:00	f	2026-02-05 08:42:23.689
cml97kdct000tbe3gc08dul4e	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-03 00:00:00	f	2026-02-05 08:42:22.493
cml97ke2r001fbe3gwkjhqqch	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-04 00:00:00	f	2026-02-05 08:42:23.427
cml97ke53001hbe3gaoop08zd	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-04 00:00:00	f	2026-02-05 08:42:23.512
cml97ke7k001jbe3gqkogxga8	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-05 00:00:00	f	2026-02-05 08:42:23.6
cml97ked9001nbe3glkvojlmq	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-05 00:00:00	f	2026-02-05 08:42:23.806
cml97kcpd0009be3g2ermrwjx	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-01 00:00:00	f	2026-02-05 08:42:21.65
cml97kd3e000lbe3gjhwx7qy5	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-02 00:00:00	f	2026-02-05 08:42:22.154
cml97kdy5001bbe3gse2vjuea	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-04 00:00:00	f	2026-02-05 08:42:23.261
cml97ke0f001dbe3gsst50y4x	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-04 00:00:00	f	2026-02-05 08:42:23.344
cml97kefm001pbe3gn40s6k27	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-05 00:00:00	f	2026-02-05 08:42:23.89
cml97kehz001rbe3g4sannpvw	cml5g1xzx001oua47iy5u23oh	cml66dluc000613miw0vgbha7	2026-02-05 00:00:00	f	2026-02-05 08:42:23.975
cml97keka001tbe3gpkas5uqw	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-05 00:00:00	f	2026-02-05 08:42:24.058
cml97keml001vbe3g1bl944xh	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-05 00:00:00	f	2026-02-05 08:42:24.141
cml97keox001xbe3gpfllp524	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-06 00:00:00	f	2026-02-05 08:42:24.226
cml97keto0021be3gwc76xa7e	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-06 00:00:00	f	2026-02-05 08:42:24.397
cmlaivhk8000934n030gbj2xh	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-04 00:00:00	f	2026-02-06 06:46:42.9
cml97kerd001zbe3gymj5qlkf	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-06 00:00:00	f	2026-02-05 08:42:24.313
cml97kf0o0027be3gic95ngjk	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-06 00:00:00	f	2026-02-05 08:42:24.649
cml97kf300029be3g8f0kp34h	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-06 00:00:00	f	2026-02-05 08:42:24.732
cml97kf5b002bbe3g7y79j3c1	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-07 00:00:00	f	2026-02-05 08:42:24.816
cml97kf7m002dbe3g8muajbx2	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-07 00:00:00	f	2026-02-05 08:42:24.899
cml97kf9z002fbe3gf9lcgyw9	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-07 00:00:00	f	2026-02-05 08:42:24.984
cml97kfo0002rbe3gb1tovbrr	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-08 00:00:00	f	2026-02-05 08:42:25.489
cml97kg4o0035be3gx2q6ti22	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-09 00:00:00	f	2026-02-05 08:42:26.089
cml97kfh2002lbe3g1w54bjoo	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-07 00:00:00	f	2026-02-05 08:42:25.238
cml97kfjd002nbe3g19ga6x54	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-07 00:00:00	f	2026-02-05 08:42:25.321
cml97kflp002pbe3gauz4aewa	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-08 00:00:00	f	2026-02-05 08:42:25.405
cml97kfqe002tbe3g9aupvr8r	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-08 00:00:00	f	2026-02-05 08:42:25.574
cml97kgip003hbe3gf04yye70	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-10 00:00:00	f	2026-02-05 08:42:26.594
cml97kgz1003vbe3gpsnj597l	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-11 00:00:00	f	2026-02-05 08:42:27.182
cml97kfxf002zbe3gibls967y	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-08 00:00:00	f	2026-02-05 08:42:25.827
cml97kfzr0031be3g218obfgl	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-08 00:00:00	f	2026-02-05 08:42:25.911
cml97kg2c0033be3gxxzxgae0	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-09 00:00:00	f	2026-02-05 08:42:26.004
cml97kg700037be3gbtqr7odx	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-09 00:00:00	f	2026-02-05 08:42:26.173
cml97khf70049be3g3rkjwjo9	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-12 00:00:00	f	2026-02-05 08:42:27.763
cml97kgbr003bbe3gcwqij9wr	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-09 00:00:00	f	2026-02-05 08:42:26.344
cml97kge2003dbe3g4hpzdp02	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-09 00:00:00	f	2026-02-05 08:42:26.427
cml97kgge003fbe3gbnv3jle5	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-09 00:00:00	f	2026-02-05 08:42:26.51
cml97kgl3003jbe3goqmr5h0m	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-10 00:00:00	f	2026-02-05 08:42:26.679
cml97kgne003lbe3gu2vcu4co	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-10 00:00:00	f	2026-02-05 08:42:26.762
cml97kgpp003nbe3gc1edmgyy	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-10 00:00:00	f	2026-02-05 08:42:26.846
cml97kgs1003pbe3ged4xva0s	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-10 00:00:00	f	2026-02-05 08:42:26.93
cml97kgue003rbe3gbsp60mfr	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-10 00:00:00	f	2026-02-05 08:42:27.014
cml97kgwq003tbe3g66ow3j74	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-11 00:00:00	f	2026-02-05 08:42:27.099
cml97kh1d003xbe3gb297ztdp	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-11 00:00:00	f	2026-02-05 08:42:27.265
cml97khvf004nbe3g8kk0za1l	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-13 00:00:00	f	2026-02-05 08:42:28.348
cml97kh890043be3gus1skn0t	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-11 00:00:00	f	2026-02-05 08:42:27.514
cml97khak0045be3grkoan6bi	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-11 00:00:00	f	2026-02-05 08:42:27.597
cml97khcv0047be3gnz8ggusq	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-02-12 00:00:00	f	2026-02-05 08:42:27.68
cml97khhh004bbe3gd9ctvoix	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-12 00:00:00	f	2026-02-05 08:42:27.846
cml97khoi004hbe3g8fif9nmw	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-12 00:00:00	f	2026-02-05 08:42:28.098
cml97khqt004jbe3gpx9t5u6x	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-12 00:00:00	f	2026-02-05 08:42:28.182
cml97khxr004pbe3gt6a9o4qs	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-13 00:00:00	f	2026-02-05 08:42:28.431
cml97ki55004vbe3ge22mo4td	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-13 00:00:00	f	2026-02-05 08:42:28.698
cml97ki7w004xbe3grvrtpfaf	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-13 00:00:00	f	2026-02-05 08:42:28.797
cml97kicl0051be3ge38n0jee	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-14 00:00:00	f	2026-02-05 08:42:28.965
cml97kiew0053be3gce7xfg52	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-14 00:00:00	f	2026-02-05 08:42:29.048
cml97keyd0025be3ga5dfmkzm	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-06 00:00:00	f	2026-02-05 08:42:24.565
cml97kfcb002hbe3gh5904rln	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-07 00:00:00	f	2026-02-05 08:42:25.068
cml97kfen002jbe3g41c5nh8l	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-07 00:00:00	f	2026-02-05 08:42:25.152
cml97kfsp002vbe3g1azu591j	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-08 00:00:00	f	2026-02-05 08:42:25.658
cml97kfv1002xbe3g9nn8teoa	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-08 00:00:00	f	2026-02-05 08:42:25.742
cml97kg9e0039be3g3oyybw7e	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-09 00:00:00	f	2026-02-05 08:42:26.259
cml97kh3n003zbe3goe4eafcp	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-11 00:00:00	f	2026-02-05 08:42:27.348
cml97kh5y0041be3g4hyco5b1	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-11 00:00:00	f	2026-02-05 08:42:27.431
cml97khjs004dbe3gcnto0x9z	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-12 00:00:00	f	2026-02-05 08:42:27.928
cml97khm6004fbe3gpxgvo5ls	cml5g1xzx001oua47iy5u23oh	cml66dluc000613miw0vgbha7	2026-02-12 00:00:00	f	2026-02-05 08:42:28.014
cml97ki04004rbe3gwn9eusp0	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-13 00:00:00	f	2026-02-05 08:42:28.517
cml97ki2f004tbe3gdxlokdrq	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-13 00:00:00	f	2026-02-05 08:42:28.6
cml97kih70055be3gwhag3y05	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-14 00:00:00	f	2026-02-05 08:42:29.132
cmlaivhvo000d34n0st4qqs26	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-06 00:00:00	f	2026-02-06 06:46:42.9
cml97kilu0059be3g84qhv5im	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-14 00:00:00	f	2026-02-05 08:42:29.299
cml97kio8005bbe3gpf21nqkd	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-14 00:00:00	f	2026-02-05 08:42:29.384
cml97kivb005hbe3ge8mlu8lp	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-15 00:00:00	f	2026-02-05 08:42:29.639
cml97kjnd0065be3gr7lu0vtr	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-17 00:00:00	f	2026-02-05 08:42:30.65
cml97kk3n006jbe3gfmogbs61	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-18 00:00:00	f	2026-02-05 08:42:31.235
cml97kj2e005nbe3gosk8qw1h	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-15 00:00:00	f	2026-02-05 08:42:29.895
cml97kj4q005pbe3gym7u1yeu	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-15 00:00:00	f	2026-02-05 08:42:29.979
cml97kjbq005vbe3ghj453b0f	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-16 00:00:00	f	2026-02-05 08:42:30.23
cml97kkjz006xbe3gbuppd50g	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-19 00:00:00	f	2026-02-05 08:42:31.823
cml97kjge005zbe3gnanxehbu	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-16 00:00:00	f	2026-02-05 08:42:30.398
cml97kjip0061be3gufbfrwnv	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-16 00:00:00	f	2026-02-05 08:42:30.481
cml97kjl10063be3gbqvmk81j	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-16 00:00:00	f	2026-02-05 08:42:30.565
cml97kjpo0067be3g8m36xqrr	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-17 00:00:00	f	2026-02-05 08:42:30.732
cml97kjrz0069be3ggltluu9y	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-17 00:00:00	f	2026-02-05 08:42:30.816
cml97kjua006bbe3gizsjtw2o	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-17 00:00:00	f	2026-02-05 08:42:30.899
cml97kjwl006dbe3gdi5o3s7x	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-17 00:00:00	f	2026-02-05 08:42:30.981
cml97kjyy006fbe3g1is37zte	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-17 00:00:00	f	2026-02-05 08:42:31.067
cml97kk5x006lbe3g5veyb6ht	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-18 00:00:00	f	2026-02-05 08:42:31.318
cml97kl08007bbe3goyw33dqd	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-20 00:00:00	f	2026-02-05 08:42:32.409
cml97klwu0083be3g55wjz9h5	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-22 00:00:00	f	2026-02-05 08:42:33.583
cml97kkcv006rbe3geuow6oze	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-18 00:00:00	f	2026-02-05 08:42:31.568
cml97kkf9006tbe3gqktkh6jg	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-18 00:00:00	f	2026-02-05 08:42:31.654
cml97kkma006zbe3gfiq8y92x	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-19 00:00:00	f	2026-02-05 08:42:31.907
cml97kmdk008hbe3gbmnbvsid	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-23 00:00:00	f	2026-02-05 08:42:34.185
cml97kisx005fbe3gvihds2bk	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-15 00:00:00	f	2026-02-05 08:42:29.554
cml97kkta0075be3gyp6cnx4w	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-19 00:00:00	f	2026-02-05 08:42:32.159
cml97kkvl0077be3g0p6yie5z	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-19 00:00:00	f	2026-02-05 08:42:32.242
cml97kl2l007dbe3gs6svvnoc	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-20 00:00:00	f	2026-02-05 08:42:32.494
cml97kj9d005tbe3g4vw7star	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-16 00:00:00	f	2026-02-05 08:42:30.145
cml97kl9k007jbe3gd0c76ofa	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-20 00:00:00	f	2026-02-05 08:42:32.745
cml97klbw007lbe3gpxlaxs27	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-20 00:00:00	f	2026-02-05 08:42:32.829
cml97klgj007pbe3g8b5nis9b	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-21 00:00:00	f	2026-02-05 08:42:32.996
cml97kliv007rbe3gzwyrudie	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-21 00:00:00	f	2026-02-05 08:42:33.08
cml97klpv007xbe3gpoc2h6hn	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-21 00:00:00	f	2026-02-05 08:42:33.332
cml97kls7007zbe3gmt029zgl	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-21 00:00:00	f	2026-02-05 08:42:33.415
cml97klz60085be3gxs8kdjgs	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-22 00:00:00	f	2026-02-05 08:42:33.666
cml97km6h008bbe3g21v4yn3u	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-22 00:00:00	f	2026-02-05 08:42:33.929
cml97km8s008dbe3gobwgiwch	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-22 00:00:00	f	2026-02-05 08:42:34.013
cml97kmfw008jbe3g7xcacy6k	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-23 00:00:00	f	2026-02-05 08:42:34.269
cml97kixp005jbe3guapyziq8	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-15 00:00:00	f	2026-02-05 08:42:29.725
cml97kj02005lbe3gspgy7fnh	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-15 00:00:00	f	2026-02-05 08:42:29.811
cml97kje2005xbe3gr4ay0fu8	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-16 00:00:00	f	2026-02-05 08:42:30.315
cml97kk88006nbe3g1nppo2oz	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-18 00:00:00	f	2026-02-05 08:42:31.401
cml97kkak006pbe3gbsme5wj1	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-18 00:00:00	f	2026-02-05 08:42:31.485
cml97kkom0071be3gidprbfru	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-19 00:00:00	f	2026-02-05 08:42:31.991
cml97kkqy0073be3gtgj1hgrz	cml5g1xzx001oua47iy5u23oh	cml66dluc000613miw0vgbha7	2026-02-19 00:00:00	f	2026-02-05 08:42:32.075
cml97kl4x007fbe3g86dgbx5n	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-20 00:00:00	f	2026-02-05 08:42:32.578
cml97kl79007hbe3g65f1hrdt	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-20 00:00:00	f	2026-02-05 08:42:32.661
cml97kll8007tbe3gbqmsxlng	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-21 00:00:00	f	2026-02-05 08:42:33.165
cml97klnk007vbe3gueqluzl5	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-21 00:00:00	f	2026-02-05 08:42:33.248
cml97km1h0087be3gu1pp97by	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-22 00:00:00	f	2026-02-05 08:42:33.749
cml97km450089be3g6g3dd8k5	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-22 00:00:00	f	2026-02-05 08:42:33.846
cmlaivhvx000f34n0nnbpt08j	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-10 00:00:00	f	2026-02-06 06:46:42.9
cml97kmkk008nbe3ggebqw11j	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-23 00:00:00	f	2026-02-05 08:42:34.436
cml97kmmv008pbe3gkni63ey7	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-23 00:00:00	f	2026-02-05 08:42:34.519
cml97kmp7008rbe3gae0nsbj3	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-23 00:00:00	f	2026-02-05 08:42:34.604
cml97kmtv008vbe3gtpncxpdm	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-24 00:00:00	f	2026-02-05 08:42:34.772
cml97kmw6008xbe3ga22tuk1p	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-24 00:00:00	f	2026-02-05 08:42:34.855
cml97kmyh008zbe3g1mgpty64	cml5g1xzx001oua47iy5u23oh	cml66dlrp000413miapldg649	2026-02-24 00:00:00	f	2026-02-05 08:42:34.938
cml97kn0u0091be3gu80637z6	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-24 00:00:00	f	2026-02-05 08:42:35.022
cml97kn350093be3g2ural6rq	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-24 00:00:00	f	2026-02-05 08:42:35.105
cml97knaf0099be3get67evjo	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-25 00:00:00	f	2026-02-05 08:42:35.367
cmlaivhw1000h34n0ey68nj4w	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-07 00:00:00	f	2026-02-06 06:46:42.9
cmlaivi1z000r34n0y4y4lqad	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-13 00:00:00	f	2026-02-06 06:46:42.901
cml97knhe009fbe3ghtqym5kh	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-25 00:00:00	f	2026-02-05 08:42:35.618
cml97knjq009hbe3gk3ekzrfi	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-25 00:00:00	f	2026-02-05 08:42:35.702
cml97knqp009nbe3gk55gdrzp	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-26 00:00:00	f	2026-02-05 08:42:35.954
cmlaivi22000v34n09eliuda8	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-22 00:00:00	f	2026-02-06 06:46:42.901
cmlaivi7b000x34n0kkuj1pps	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-15 00:00:00	f	2026-02-06 06:46:42.901
cml97knyx009tbe3gc6os1p46	cml5g289u003uua47ulssk26x	cml66dlsx000513miz5zih4e0	2026-02-26 00:00:00	f	2026-02-05 08:42:36.25
cml97ko1a009vbe3gtci9nf05	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-26 00:00:00	f	2026-02-05 08:42:36.334
cml97ko8a00a1be3g9d3v8ww9	cml5g1tky000wua47qqpf53wn	cml66dlp1000213mi39m55khx	2026-02-27 00:00:00	f	2026-02-05 08:42:36.587
cmlaivi7q000z34n0s3m7yoic	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-23 00:00:00	f	2026-02-06 06:46:42.901
cmlaivi7w001134n0gxznuwiu	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-16 00:00:00	f	2026-02-06 06:46:42.901
cml97kofp00a7be3gdfwf58rj	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-27 00:00:00	f	2026-02-05 08:42:36.853
cml97kohz00a9be3ggmqpxfnz	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-27 00:00:00	f	2026-02-05 08:42:36.935
cml97koml00adbe3g2i52vix1	cml5g1tky000wua47qqpf53wn	cml66dlno000113mih77suyuc	2026-02-28 00:00:00	f	2026-02-05 08:42:37.102
cml97kooy00afbe3gdv8phcfk	cml5g1vmh001aua47rlxc2pr1	cml66dlp1000213mi39m55khx	2026-02-28 00:00:00	f	2026-02-05 08:42:37.186
cmlaividu001d34n0zmj3gp2u	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-19 00:00:00	f	2026-02-06 06:46:42.901
cmlaividy001f34n0epq8lwvk	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-27 00:00:00	f	2026-02-06 06:46:42.901
cml97kovw00albe3g0cy653o5	cml5g20im0022ua4780xu5bou	cml66dlsx000513miz5zih4e0	2026-02-28 00:00:00	f	2026-02-05 08:42:37.436
cml97koy700anbe3gkahg10bm	cml5g22hz002gua47temxhj1t	cml66dlsx000513miz5zih4e0	2026-02-28 00:00:00	f	2026-02-05 08:42:37.519
cml97kcn20007be3g93j6xzfv	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-01 00:00:00	f	2026-02-05 08:42:21.567
cml97kew00023be3gtv7h3w54	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-06 00:00:00	f	2026-02-05 08:42:24.481
cml97kijj0057be3gnarctw0n	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-14 00:00:00	f	2026-02-05 08:42:29.215
cml97kmi7008lbe3gm1c0flci	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-23 00:00:00	f	2026-02-05 08:42:34.352
cml97kncp009bbe3gtgszt4km	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-25 00:00:00	f	2026-02-05 08:42:35.45
cml97knf2009dbe3gm2noznan	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-25 00:00:00	f	2026-02-05 08:42:35.535
cml97knu5009pbe3gs81zwkk7	cml5g1vmh001aua47rlxc2pr1	cml66dlqb000313mi4rwg7lgc	2026-02-26 00:00:00	f	2026-02-05 08:42:36.078
cml97knwl009rbe3guwop0yo0	cml5g1xzx001oua47iy5u23oh	cml66dluc000613miw0vgbha7	2026-02-26 00:00:00	f	2026-02-05 08:42:36.165
cml97koap00a3be3g7kch7zl8	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-27 00:00:00	f	2026-02-05 08:42:36.673
cml97kodc00a5be3g0ycscq9t	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-27 00:00:00	f	2026-02-05 08:42:36.769
cml97kor900ahbe3gkreclc64	cml5g1xzx001oua47iy5u23oh	cml66dlqb000313mi4rwg7lgc	2026-02-28 00:00:00	f	2026-02-05 08:42:37.269
cml97kotk00ajbe3gfwpb0s9m	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-02-28 00:00:00	f	2026-02-05 08:42:37.353
cmlab8auu000c3sibw7noa0on	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-21 00:00:00	f	2026-02-06 03:12:43.812
cmlab8auw000e3sibsh7ucp43	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-03 00:00:00	f	2026-02-06 03:12:43.812
cmlab8auy000g3sib30kn5e06	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-22 00:00:00	f	2026-02-06 03:12:43.812
cmlab8av1000i3sib0c4dkiaw	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-02 00:00:00	f	2026-02-06 03:12:43.812
cmlab8av6000k3sib2nyj4ni8	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-01 00:00:00	f	2026-02-06 03:12:43.812
cmlab8b82000o3sibi4hr1y3b	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-04 00:00:00	f	2026-02-06 03:12:43.812
cmlab8b80000m3sibqp88r9pk	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-23 00:00:00	f	2026-02-06 03:12:43.812
cmlab8b83000q3sibpxecn4jg	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-24 00:00:00	f	2026-02-06 03:12:43.812
cmlab8b86000s3sibmbe5djn3	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-05 00:00:00	f	2026-02-06 03:12:43.813
cmlab8b8e000u3sibk8u8pw0o	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-25 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bdy000y3sibwu0dtdl4	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-26 00:00:00	f	2026-02-06 03:12:43.813
cml97kmrk008tbe3glohueyit	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-24 00:00:00	f	2026-02-05 08:42:34.688
cml97kn810097be3g14rw5xqs	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-25 00:00:00	f	2026-02-05 08:42:35.281
cml97knod009lbe3gxndwp8cm	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-26 00:00:00	f	2026-02-05 08:42:35.87
cml97ko5y009zbe3gpecbxq68	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-27 00:00:00	f	2026-02-05 08:42:36.502
cmlab8bdy000w3sibn6fa9mge	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-06 00:00:00	f	2026-02-06 03:12:43.813
cmlab8be200103sib0j7t5i97	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-07 00:00:00	f	2026-02-06 03:12:43.813
cmlab8be800123sibprvel8w8	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-27 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bel00143sibrpuuqnim	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-08 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bju00163sib2ei5d7ni	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-28 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bjw00183sib87x1dyt5	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-09 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bk1001a3sib1yoza67a	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-29 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bkb001c3sibprkl9zqi	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-10 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bks001e3sib3fpy6mb9	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-30 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bpr001g3siblpeo3cb8	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-11 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bpu001i3sibfdui4q3p	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-31 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bq0001k3sibp01qvy5g	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-12 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bqf001m3sib5n7cq0jr	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-01 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bqz001o3sibzp78qjf9	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-13 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bvn001q3sibwtk4m963	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-02 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bvs001s3sib8sp3vmtg	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-14 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bvz001u3sibm0e0gh0g	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-03 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bwh001w3sibhckzctv0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-15 00:00:00	f	2026-02-06 03:12:43.813
cmlab8bx6001y3sibqjjju8us	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-04 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c1j00203sib6hhlzwqz	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-16 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c1q00223sibww0z1css	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-05 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c1y00243sibttqhnq49	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-17 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c2k00263sib4h85t2pq	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-06 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c3d00283sibe6yxe9no	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-18 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c7f002a3sibyx5nkeup	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-07 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c7o002c3sib1a6kre44	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-19 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c7x002e3sib4wjxsaap	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-08 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c8n002g3sibdb0ereg0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-01-20 00:00:00	f	2026-02-06 03:12:43.813
cmlab8c9l002i3sib3m8q3av0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-09 00:00:00	f	2026-02-06 03:12:43.813
cmlab8cdc002k3sib7t07gmzk	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-10 00:00:00	f	2026-02-06 03:12:43.813
cmlab8cdm002m3sibf54v0p55	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-15 00:00:00	f	2026-02-06 03:12:43.813
cmlab8cdw002o3sibucbfz99t	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-11 00:00:00	f	2026-02-06 03:12:43.813
cmlab8ceq002q3sib76knlo8s	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-16 00:00:00	f	2026-02-06 03:12:43.813
cmlab8cg5002s3sibfz3dpm95	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-12 00:00:00	f	2026-02-06 03:12:43.813
cmlab8cj8002u3sibp4xia79k	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-13 00:00:00	f	2026-02-06 03:12:43.813
cmlab8cjk002w3sibsj6hsds0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-14 00:00:00	f	2026-02-06 03:12:43.813
cmlab8cjw002y3sibg0snsd5z	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-15 00:00:00	f	2026-02-06 03:12:43.814
cmlab8ckt00303sibnvg0to0j	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-17 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cmc00323sibvmiv2v7h	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-16 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cpi00363sibr5f75smp	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-18 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cp400343sib319xldsf	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-17 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cpv00383sibr4d9ypc0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-19 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cqw003a3sibcgj5l96k	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-20 00:00:00	f	2026-02-06 03:12:43.814
cmlab8csj003c3sibx8q0va8w	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-21 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cvg003e3sibes6idrrl	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-22 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cvq003g3sib03r0bhmc	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-23 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cw3003i3sibrqo1gryg	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-24 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cwz003k3sib37qsfm46	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-25 00:00:00	f	2026-02-06 03:12:43.814
cmlab8cyr003m3sibs079oyvk	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-26 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d1e003o3sib02xsiepc	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-27 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d1l003q3sibwnmluvgn	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-02-28 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d23003s3sibgrjvwy4p	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-01 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d32003u3sib57c0g2bv	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-18 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d4z003w3sibjbn06q4r	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-02 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d7c003y3sibqpex8lqc	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-03 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d7h00403sib9nx53tnf	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-04 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d8200423siblmymmdu8	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-05 00:00:00	f	2026-02-06 03:12:43.814
cmlab8d9600443sibc0b6cm05	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-06 00:00:00	f	2026-02-06 03:12:43.814
cmlab8db600463sibff06qivo	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-07 00:00:00	f	2026-02-06 03:12:43.814
cmlab8ddd004a3sib9gu5ye2c	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-19 00:00:00	f	2026-02-06 03:12:43.815
cmlab8hsk00bl3sib5ogoi3p0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-27 00:00:00	f	2026-02-06 03:12:43.848
cmlab8dda00483sibdeoiwna5	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-08 00:00:00	f	2026-02-06 03:12:43.814
cmlab8de1004c3sib99yub0m3	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-20 00:00:00	f	2026-02-06 03:12:43.815
cmlab8df9004e3sibwhtwe1hl	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-23 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dhf004g3sibl5ztzcvm	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-21 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dja004k3sib5nayy9jx	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-22 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dj8004i3sibiwkq70eu	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-24 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dk0004m3sib9bs0o8tb	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-25 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dlc004o3sibufsmw3r9	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-23 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dnm004q3sibfbfuluaq	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-26 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dp6004s3sib3dcurtmg	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-24 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dp6004u3sibir3jb47l	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-27 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dq3004w3sibz1b1hvak	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-25 00:00:00	f	2026-02-06 03:12:43.815
cmlab8drf004y3sibzzmtpgy1	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-28 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dtt00503sibtupyxnst	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-26 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dv200523sibf21jwxgl	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-29 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dv400543sib9x50cgf1	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-27 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dw200563sib3b2c04l7	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-30 00:00:00	f	2026-02-06 03:12:43.815
cmlab8dxi00583sibf4wwkakb	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-28 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e01005a3sib96ora446	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-29 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e0y005c3sibg5xi7mj0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-30 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e11005e3sib0wbic49z	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-01 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e22005g3sibpdv4duaf	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-01 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e3m005i3sibkt4s959b	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-02 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e68005k3sibodq1j8qj	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-03 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e6u005m3sibi01cjkzu	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-04 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e6z005o3sibon1ntrqw	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-05 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e83005q3sib3npukdtt	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-06 00:00:00	f	2026-02-06 03:12:43.815
cmlab8e9p005s3sibnssb2h1e	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-07 00:00:00	f	2026-02-06 03:12:43.815
cmlab8ecf005u3sibhsxkfadj	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-08 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ecr005w3sibqo5zpihx	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-02 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ecx005y3sibuzq6xpo9	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-09 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ee300603sibbezeofmf	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-10 00:00:00	f	2026-02-06 03:12:43.827
cmlab8efs00623sibov6dfa4b	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-11 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ein00643sibn5nsw28c	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-12 00:00:00	f	2026-02-06 03:12:43.827
cmlab8eis00663sibbv87a1rb	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-13 00:00:00	f	2026-02-06 03:12:43.827
cmlab8eiv00683sibc9u2k0yq	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-14 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ek2006a3sib5lquk8eg	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-15 00:00:00	f	2026-02-06 03:12:43.827
cmlab8elv006c3sib54qlklk6	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-03 00:00:00	f	2026-02-06 03:12:43.827
cmlab8eok006e3siblz7bfj5x	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-16 00:00:00	f	2026-02-06 03:12:43.827
cmlab8eot006g3sibguq61o71	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-17 00:00:00	f	2026-02-06 03:12:43.827
cmlab8eoz006i3sibzhip3s6r	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-18 00:00:00	f	2026-02-06 03:12:43.827
cmlab8eq1006k3sib3cdelew0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-19 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ery006m3sibz5x4xhfc	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-20 00:00:00	f	2026-02-06 03:12:43.827
cmlab8eug006o3sib4fjmtatr	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-21 00:00:00	f	2026-02-06 03:12:43.827
cmlab8eur006q3sibo8yqv3nl	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-22 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ev6006s3sibjdwr81d8	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-04 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ew0006u3sibwo81smxg	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-23 00:00:00	f	2026-02-06 03:12:43.827
cmlab8ey2006w3sib2fpd7v8d	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-24 00:00:00	f	2026-02-06 03:12:43.827
cmlab8f0c006y3sibu0kq9yl6	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-25 00:00:00	f	2026-02-06 03:12:43.828
cmlab8f0q00703sibkh7tlcp7	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-26 00:00:00	f	2026-02-06 03:12:43.828
cmlab8f1d00723sibhujwydzn	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-05 00:00:00	f	2026-02-06 03:12:43.828
cmlab8f1z00743sibmyr896em	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-27 00:00:00	f	2026-02-06 03:12:43.828
cmlab8f4500763sibcuxhq1kg	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-06 00:00:00	f	2026-02-06 03:12:43.828
cmlab8f6800783sibfzdm7fii	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-28 00:00:00	f	2026-02-06 03:12:43.828
cmlab8f6o007a3sib3aynk218	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-07 00:00:00	f	2026-02-06 03:12:43.828
cmlab8f7k007c3sib2csuyofy	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-29 00:00:00	f	2026-02-06 03:12:43.828
cmlab8f7z007e3sibqynmkpg6	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-08 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fa8007g3sib3sbswyin	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-30 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fc4007i3sibnt8ft2ui	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-09 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fcm007k3sibuqtk0yyd	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-05-31 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fdr007m3sib6zuw0jrn	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-10 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fea007o3sib164i6qg8	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-01 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fgb007q3sibdrzksusf	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-11 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fi1007s3sib1o4ut26w	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-02 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fik007u3sibu2jea39l	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-12 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fjy007w3sibagmqkito	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-03 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fk9007y3sibtx7xxgje	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-13 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fme00803sib0c3au43l	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-04 00:00:00	f	2026-02-06 03:12:43.828
cmlab8fnx00823sibipefwfjk	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-14 00:00:00	f	2026-02-06 03:12:43.829
cmlab8foi00843sibqflk3juy	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-05 00:00:00	f	2026-02-06 03:12:43.829
cmlab8fq600863sibqyplykhg	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-15 00:00:00	f	2026-02-06 03:12:43.829
cmlab8fqc00883sibh2oak8xx	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-06 00:00:00	f	2026-02-06 03:12:43.829
cmlab8fsh008a3sibd8cijrhe	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-16 00:00:00	f	2026-02-06 03:12:43.829
cmlab8ftt008c3sibaebc97du	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-07 00:00:00	f	2026-02-06 03:12:43.829
cmlab8fug008e3sib7xlwn1zn	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-17 00:00:00	f	2026-02-06 03:12:43.829
cmlab8fwd008i3siblmvmqciz	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-18 00:00:00	f	2026-02-06 03:12:43.829
cmlab8fwc008g3sib54we875a	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-08 00:00:00	f	2026-02-06 03:12:43.829
cmlab8fyk008k3sib5d7qy7f9	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-09 00:00:00	f	2026-02-06 03:12:43.829
cmlab8fzq008m3sib5rlpi6il	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-10 00:00:00	f	2026-02-06 03:12:43.829
cmlab8g0e008o3sib67rmdy95	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-11 00:00:00	f	2026-02-06 03:12:43.829
cmlab8g2k008q3sibrx66o016	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-12 00:00:00	f	2026-02-06 03:12:43.829
cmlab8g2l008s3sib0erpg0ov	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-19 00:00:00	f	2026-02-06 03:12:43.829
cmlab8g4n008u3sibetw5ena3	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-13 00:00:00	f	2026-02-06 03:12:43.829
cmlab8g5m008w3sibxsl4sj0z	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-14 00:00:00	f	2026-02-06 03:12:43.829
cmlab8g6c008y3sibdotthx40	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-15 00:00:00	f	2026-02-06 03:12:43.829
cmlab8g8k00903sib7tgmz13r	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-16 00:00:00	f	2026-02-06 03:12:43.829
cmlab8g8r00923sibjbjj6bpq	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-17 00:00:00	f	2026-02-06 03:12:43.829
cmlab8gaq00943sibx916cy2b	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-18 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gbi00963sibznzwcfgt	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-19 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gcg00983sibn1c8vhnt	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-20 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gek009a3sibvzgyra69	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-20 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gez009c3sibn2aw3794	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-21 00:00:00	f	2026-02-06 03:12:43.83
cmlab8ggx009e3sib16jx55vi	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-06-22 00:00:00	f	2026-02-06 03:12:43.83
cmlab8ghf009g3sib22mjq3dp	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-21 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gif009i3sibjyeiqrte	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-22 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gkj009k3sibtuzm8a46	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-23 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gl6009m3sibhahcmqh6	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-24 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gn0009o3sibe2vnybpa	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-09-23 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gnc009q3sibgdkwh5la	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-25 00:00:00	f	2026-02-06 03:12:43.83
cmlab8god009s3sibvu6ad84x	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-26 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gqi009u3sibv9zwkvch	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-27 00:00:00	f	2026-02-06 03:12:43.83
cmlab8grd009w3sibgizkwdvm	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-28 00:00:00	f	2026-02-06 03:12:43.83
cmlab8gt3009y3sibmt0z70uc	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-09 00:00:00	f	2026-02-06 03:12:43.814
cmlab8gt800a03sibh3h8f8n8	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-10 00:00:00	f	2026-02-06 03:12:43.843
cmlab8gub00a23sib9kg6rwjx	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-11 00:00:00	f	2026-02-06 03:12:43.843
cmlab8gwh00a43sibutcuwycu	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-12 00:00:00	f	2026-02-06 03:12:43.843
cmlab8gxk00a63sibtb5uga3c	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-13 00:00:00	f	2026-02-06 03:12:43.843
cmlab8gz400a83sibr63h1lt0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-14 00:00:00	f	2026-02-06 03:12:43.843
cmlab8gz600aa3sibm35oiy0x	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-15 00:00:00	f	2026-02-06 03:12:43.843
cmlab8h0900ac3sib9lm0yrq1	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-09-24 00:00:00	f	2026-02-06 03:12:43.843
cmlab8h2h00ae3sib4ao42mk9	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-16 00:00:00	f	2026-02-06 03:12:43.843
cmlab8h3r00ag3sibt4tu8qvp	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-09-25 00:00:00	f	2026-02-06 03:12:43.845
cmlab8h5000ai3sibmigp97in	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-17 00:00:00	f	2026-02-06 03:12:43.847
cmlab8h5900ak3sibm2jtxuhw	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-09-26 00:00:00	f	2026-02-06 03:12:43.847
cmlab8h6800am3sibf6rn2dqq	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-18 00:00:00	f	2026-02-06 03:12:43.847
cmlab8h8g00ao3sibrod7ljts	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-09-27 00:00:00	f	2026-02-06 03:12:43.847
cmlab8h9y00aq3sibdbgjbjin	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-19 00:00:00	f	2026-02-06 03:12:43.847
cmlab8haw00as3sibpoc0q5u9	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-09-28 00:00:00	f	2026-02-06 03:12:43.847
cmlab8hbb00au3sibp3pl2oe0	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-20 00:00:00	f	2026-02-06 03:12:43.847
cmlab8hcq00aw3siboe3hhe4y	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-09-29 00:00:00	f	2026-02-06 03:12:43.847
cmlab8hef00ay3sibra51psyw	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-21 00:00:00	f	2026-02-06 03:12:43.847
cmlab8hg600b03sibtcxd9bdc	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-09-30 00:00:00	f	2026-02-06 03:12:43.847
cmlab8hgs00b23sibqrp66r27	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-22 00:00:00	f	2026-02-06 03:12:43.847
cmlab8hhe00b43sib9t5sma16	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-01 00:00:00	f	2026-02-06 03:12:43.847
cmlab8hip00b63sibndgz2fwl	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-23 00:00:00	f	2026-02-06 03:12:43.847
cmlab8hkf00b83sibv2rf1emn	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-02 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hmd00ba3sibto7b55ti	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-24 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hmo00bc3sibnqkiuuse	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-03 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hnh00be3sibpt7i9z49	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-25 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hoo00bg3sibtifibyie	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-04 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hqe00bi3sibr3xmbqyq	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-26 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hsk00bm3sibnc4wcuby	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-05 00:00:00	f	2026-02-06 03:12:43.848
cmlaivhw2000j34n02u5fc2g9	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-11 00:00:00	f	2026-02-06 06:46:42.9
cmlaivhw4000l34n0h62b1pzn	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-08 00:00:00	f	2026-02-06 06:46:42.9
cmlaivi1i000n34n09bp7s1c1	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-12 00:00:00	f	2026-02-06 06:46:42.9
cmlaivi1u000p34n0m4wl6awf	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-09 00:00:00	f	2026-02-06 06:46:42.901
cmlaivi1z000t34n0fyswzhj4	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-14 00:00:00	f	2026-02-06 06:46:42.901
cmlaivi7w001334n0yhwqzhcz	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-24 00:00:00	f	2026-02-06 06:46:42.901
cmlaivi80001534n0psxddxe5	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-17 00:00:00	f	2026-02-06 06:46:42.901
cmlaivid4001734n0zio9tbe1	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-25 00:00:00	f	2026-02-06 06:46:42.901
cmlaividm001934n0r0qjampy	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-18 00:00:00	f	2026-02-06 06:46:42.901
cmlaividt001b34n01oc85ru8	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-26 00:00:00	f	2026-02-06 06:46:42.901
cmlaj25xr002534n0g0bwrbji	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-05 00:00:00	f	2026-02-06 06:51:53.999
cmlaj25xt002734n0z9d7rcfr	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-19 00:00:00	f	2026-02-06 06:51:53.999
cmlaj3fmn003734n0sz9dskdt	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-01-31 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fsi003934n0eone4f6j	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-03 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fsj003b34n0gnwtnuv7	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-15 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fyg003n34n0zejjmzh4	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-01 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fyj003p34n0y82jihaz	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-18 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fyp003r34n0mdmb3lyp	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-19 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3g48003t34n05d7yrai9	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-24 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3g4d003v34n0xzr18z6b	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-20 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3gaa004734n08roa1ewy	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-27 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3gae004934n0fw8y0njs	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-22 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3gas004b34n0wxdgue15	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-08 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3gg0004d34n0vf3wbd60	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-23 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3gg7004f34n0c3jxtcs4	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-09 00:00:00	f	2026-02-06 06:52:53.856
cmlaj4rng004t34n0ic89dgbc	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-01 00:00:00	f	2026-02-06 06:53:56.092
cmlaj4rtb004v34n0v98c58y0	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-02 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4rtc004x34n0k04szhpu	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-06 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4rte004z34n070pvy8mf	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-07 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4s58005j34n01ljewr0y	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-20 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4s5j005l34n0oxtidd5r	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-13 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4say005n34n0xoq7dqmy	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-14 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4sb3005p34n0b5lzgqek	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-21 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4sb5005r34n0qelpeoi0	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-15 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4sb6005t34n0uewad4z8	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-16 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4sbl005v34n0gxvdjyxt	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-22 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4sgx005x34n0qi6kqgjh	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-17 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4sh4005z34n0g8kyfrii	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-18 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4sh5006134n02i4wqxbb	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-23 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4sh5006334n0ojk4p5t8	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-24 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4shm006534n0mup3jxks	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-26 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4smt006734n0eom3jbzy	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-25 00:00:00	f	2026-02-06 06:53:56.094
cmlaj4sn2006934n0ha9jinib	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-27 00:00:00	f	2026-02-06 06:53:56.094
cmlaj65yf006b34n0d5tjz3g8	cml6ctva5000nuqrg8wh05sro	cml66dlrp000413miapldg649	2026-02-04 00:00:00	f	2026-02-06 06:55:01.287
cmlaj664d006d34n0vqo3hi4g	cml6ctva5000nuqrg8wh05sro	cml66dlrp000413miapldg649	2026-02-05 00:00:00	f	2026-02-06 06:55:01.289
cmlaj66af006f34n0naa0iu9d	cml6ctva5000nuqrg8wh05sro	cml66dlrp000413miapldg649	2026-02-08 00:00:00	f	2026-02-06 06:55:01.29
cmlaj66ai006h34n0k8d7qnlh	cml6ctva5000nuqrg8wh05sro	cml66dlrp000413miapldg649	2026-02-07 00:00:00	f	2026-02-06 06:55:01.29
cmlaj66xz006j34n039y7a0cu	cml6ctva5000nuqrg8wh05sro	cml66dlrp000413miapldg649	2026-02-03 00:00:00	f	2026-02-06 06:55:01.288
cmlaj66zp006l34n0pf71npl6	cml6ctva5000nuqrg8wh05sro	cml66dlrp000413miapldg649	2026-02-02 00:00:00	f	2026-02-06 06:55:01.287
cmlaj6700006n34n0127lzmc9	cml6ctva5000nuqrg8wh05sro	cml66dlrp000413miapldg649	2026-02-06 00:00:00	f	2026-02-06 06:55:01.289
cmlaj9t4z006p34n0aq1v24th	cml6ctvb9000puqrgafxo42i7	cml6e4r7d0005iqihai8hkhn8	2026-02-02 00:00:00	f	2026-02-06 06:57:51.089
cmlab8htk00bo3sibbys43fr7	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-06 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hum00bq3sibt92tbl79	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-28 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hwe00bs3sibkskjdn81	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-07 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hyh00bu3sibl7s3or8k	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-29 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hys00bw3sib96hka143	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-08 00:00:00	f	2026-02-06 03:12:43.848
cmlab8hzo00by3sibqrhp49f5	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-30 00:00:00	f	2026-02-06 03:12:43.848
cmlab8i0k00c03sibqqkjaxgk	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-29 00:00:00	f	2026-02-06 03:12:43.847
cmlab8i2d00c23sibl7ak7btf	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-09 00:00:00	f	2026-02-06 03:12:43.848
cmlab8i4d00c43sibzsd0b4hy	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-30 00:00:00	f	2026-02-06 03:12:43.848
cmlab8i4z00c63sibd6qy8oe6	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-03-31 00:00:00	f	2026-02-06 03:12:43.849
cmlab8i5r00c83sibvc7v3p2p	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-07-31 00:00:00	f	2026-02-06 03:12:43.849
cmlab8i6j00ca3sibl14gn43o	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-10 00:00:00	f	2026-02-06 03:12:43.849
cmlab8i8c00cc3sibtdjnism9	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-08-01 00:00:00	f	2026-02-06 03:12:43.849
cmlab8iaa00ce3sibl2e0jine	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-11 00:00:00	f	2026-02-06 03:12:43.849
cmlab8ib600cg3sibfyu0iukz	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-08-02 00:00:00	f	2026-02-06 03:12:43.849
cmlab8ibu00ci3sibldkyiwsv	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-04-01 00:00:00	f	2026-02-06 03:12:43.849
cmlab8ich00ck3sibux85yszp	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-08-03 00:00:00	f	2026-02-06 03:12:43.849
cmlab8iem00cm3sib45ns999g	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-12 00:00:00	f	2026-02-06 03:12:43.849
cmlab8ig600co3sib2x77ncme	cml6ctv0x0007uqrgprf5lu7c	cml66dlqb000313mi4rwg7lgc	2026-10-14 00:00:00	f	2026-02-06 03:12:43.863
cmlaeez0y00093u1ctquf8xd1	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-13 00:00:00	f	2026-02-06 04:41:54.13
cmlaeez0x00033u1cvz4ko73r	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-01-31 00:00:00	f	2026-02-06 04:41:54.129
cmlaeez0y000b3u1cjf3q6xah	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-03 00:00:00	f	2026-02-06 04:41:54.131
cmlaeez0y00073u1cjg282vsi	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-02 00:00:00	f	2026-02-06 04:41:54.13
cmlaeez0x00053u1cfu6517t1	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-01 00:00:00	f	2026-02-06 04:41:54.13
cmlaeezcm000d3u1ceoi5slu2	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-14 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezcn000f3u1cjuzrfg9l	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-04 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezcu000h3u1cohm924vj	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-15 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezcw000j3u1ceh69raa4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-05 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezd4000l3u1c4c2ptwjx	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-16 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezih000n3u1c8jg6k3wi	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-06 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezii000p3u1ct3967it1	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-17 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezin000r3u1ciiamafke	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-07 00:00:00	f	2026-02-06 04:41:54.131
cmlaeeziw000t3u1cyli8229t	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-18 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezj8000v3u1cjt96glnb	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-08 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezoc000x3u1cfqig1a1x	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-19 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezoc000z3u1cx50lcy55	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-09 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezog00113u1c9026cy3v	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-20 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezp800133u1c7ab78bvc	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-10 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezpb00153u1c0ipclk3t	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-21 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezu600173u1cvppajhjm	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-11 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezu600193u1c8mcgghid	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-22 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezu9001b3u1cayty0za3	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-12 00:00:00	f	2026-02-06 04:41:54.131
cmlaeezv8001d3u1c0hu6h124	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-23 00:00:00	f	2026-02-06 04:41:54.136
cmlaeezve001f3u1c6j46rbos	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-24 00:00:00	f	2026-02-06 04:41:54.136
cmlaef000001h3u1c2xpsojqc	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-06 00:00:00	f	2026-02-06 04:41:54.136
cmlaef001001j3u1cj2uxmkmx	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-25 00:00:00	f	2026-02-06 04:41:54.136
cmlaef001001l3u1c012iretv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-07 00:00:00	f	2026-02-06 04:41:54.136
cmlaef019001n3u1cxyl6coko	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-26 00:00:00	f	2026-02-06 04:41:54.136
cmlaef01h001p3u1c51o7e4ca	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-08 00:00:00	f	2026-02-06 04:41:54.136
cmlaef05u001r3u1c4h5i0tul	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-27 00:00:00	f	2026-02-06 04:41:54.136
cmlaef05u001t3u1ctf2cxvdv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-09 00:00:00	f	2026-02-06 04:41:54.136
cmlaef05w001v3u1chzs2s0by	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-02-28 00:00:00	f	2026-02-06 04:41:54.136
cmlaef079001x3u1ckmaqksuq	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-10 00:00:00	f	2026-02-06 04:41:54.136
cmlaef07l001z3u1ct1hyh2wu	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-01 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0bo00213u1cu840uwes	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-11 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0bo00233u1c004wt4oy	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-02 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0bq00253u1cgkdsilmc	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-12 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0da00273u1cfjlz8z9j	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-03 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0do00293u1c717quvq6	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-13 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0hh002b3u1cmv0fadp5	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-04 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0hi002d3u1clvcoftjt	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-14 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0hk002f3u1cv2k24777	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-05 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0ja002h3u1c6qk0ofhl	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-15 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0js002j3u1c4rs5rim3	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-16 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0nb002l3u1c5oldeqr2	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-25 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0nc002n3u1cb3cc5k7v	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-17 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0nf002p3u1czywgh39m	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-26 00:00:00	f	2026-02-06 04:41:54.136
cmlaef0pa002r3u1ch50n6xar	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-18 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0pw002t3u1cn43nds26	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-27 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0t4002v3u1c3uv0cc9w	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-19 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0t6002x3u1cezmcwrkp	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-28 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0t9002z3u1c3bd30l8i	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-20 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0vb00313u1cxq0faa81	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-29 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0vz00333u1c6qlw2pb8	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-21 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0yx00353u1cvtkslc83	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-30 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0z000373u1cl4rs18jg	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-22 00:00:00	f	2026-02-06 04:41:54.137
cmlaef0z300393u1ctejf0n76	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-01 00:00:00	f	2026-02-06 04:41:54.137
cmlaef11b003b3u1c34xrbqql	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-23 00:00:00	f	2026-02-06 04:41:54.137
cmlaef123003d3u1cnt3rt035	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-02 00:00:00	f	2026-02-06 04:41:54.137
cmlaef14q003f3u1cds2lk88u	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-24 00:00:00	f	2026-02-06 04:41:54.137
cmlaef14t003h3u1cko6961kc	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-03 00:00:00	f	2026-02-06 04:41:54.137
cmlaef14y003j3u1clku1um7l	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-25 00:00:00	f	2026-02-06 04:41:54.137
cmlaef17b003l3u1c4i52reg3	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-26 00:00:00	f	2026-02-06 04:41:54.137
cmlaef186003n3u1coujgmrzs	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-27 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1aj003p3u1cp82pw4rx	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-28 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1an003r3u1c01eg3yus	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-29 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1as003t3u1cwkb98y60	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-30 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1dc003v3u1cxgpfq3wi	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-03-31 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1ea003x3u1c02uizu4x	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-01 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1gc003z3u1c3f8uvhwe	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-04 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1gh00413u1ca4fr8ydj	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-02 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1gn00433u1cqlirrod4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-03 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1jc00453u1c5qub1apm	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-04 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1kd00473u1cefstut1a	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-05 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1m500493u1cwv6abks6	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-06 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1mb004b3u1ct05sewi5	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-07 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1mi004d3u1ciuwyqzaj	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-08 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1pc004f3u1czs0e2s2a	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-09 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1qh004h3u1c1lsbefgv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-10 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1ry004j3u1c66ipds08	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-11 00:00:00	f	2026-02-06 04:41:54.137
cmlaef1s5004l3u1cajwa355b	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-12 00:00:00	f	2026-02-06 04:41:54.138
cmlaef1sc004n3u1cympcbcg9	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-13 00:00:00	f	2026-02-06 04:41:54.138
cmlaef1vd004p3u1cpscx8580	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-14 00:00:00	f	2026-02-06 04:41:54.138
cmlaef1wk004r3u1cv50ylk2g	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-05 00:00:00	f	2026-02-06 04:41:54.138
cmlaef1xr004t3u1c1ghu7qp4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-15 00:00:00	f	2026-02-06 04:41:54.138
cmlaef1xz004v3u1ck0kxermy	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-16 00:00:00	f	2026-02-06 04:41:54.138
cmlaef1y8004x3u1clfl4epxe	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-17 00:00:00	f	2026-02-06 04:41:54.138
cmlaef21d004z3u1cypy5gqi9	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-18 00:00:00	f	2026-02-06 04:41:54.138
cmlaef22o00513u1c4s19j4x9	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-19 00:00:00	f	2026-02-06 04:41:54.138
cmlaef23k00533u1c3344ge8r	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-20 00:00:00	f	2026-02-06 04:41:54.138
cmlaef23u00553u1caoypmkn7	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-21 00:00:00	f	2026-02-06 04:41:54.138
cmlaef24300573u1cnfm9hssb	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-22 00:00:00	f	2026-02-06 04:41:54.138
cmlaef27d00593u1ckihfs93n	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-23 00:00:00	f	2026-02-06 04:41:54.138
cmlaef28r005b3u1ca24mn8cu	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-04-24 00:00:00	f	2026-02-06 04:41:54.138
cmlaef29d005d3u1caxfgh1ml	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-06 00:00:00	f	2026-02-06 04:41:54.138
cmlaef29o005f3u1cz3sbfc0x	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-07 00:00:00	f	2026-02-06 04:41:54.138
cmlaef29y005h3u1cgabccv50	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-08 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2de005j3u1c1kpe9wed	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-09 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2ev005l3u1chwzsw7m6	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-10 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2f6005n3u1c10p2rx3q	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-11 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2fi005p3u1c2v54tlx3	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-12 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2fu005r3u1cffcrm3tx	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-13 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2je005t3u1cslj935hd	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-14 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2kz005v3u1cegegiwmj	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-15 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2l0005x3u1cpiirsrd6	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-16 00:00:00	f	2026-02-06 04:41:54.138
cmlaef2ld005z3u1cvn5y6ojk	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-10 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2lo00613u1c0d423qyv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-17 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2pf00633u1cigpjwbss	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-18 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2qs00653u1cze4pm2ng	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-19 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2r700693u1c2jnpvnus	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-21 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2r300673u1crt4wdwlf	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-20 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2rj006b3u1cht4dbtzs	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-22 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2vf006d3u1csfv2goag	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-23 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2wl006f3u1c7geqz08n	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-24 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2x1006h3u1cr8lw5muv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-25 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2x6006j3u1cirfd78hy	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-26 00:00:00	f	2026-02-06 04:41:54.139
cmlaef2xe006l3u1caog5343c	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-11 00:00:00	f	2026-02-06 04:41:54.139
cmlaef31g006n3u1cirxz8052	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-27 00:00:00	f	2026-02-06 04:41:54.139
cmlaef32e006p3u1cbjb9r78z	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-28 00:00:00	f	2026-02-06 04:41:54.139
cmlaef32v006r3u1c45142t21	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-29 00:00:00	f	2026-02-06 04:41:54.139
cmlaef339006t3u1ca5cq3bf0	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-30 00:00:00	f	2026-02-06 04:41:54.139
cmlaef339006v3u1cntmmah32	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-05-31 00:00:00	f	2026-02-06 04:41:54.139
cmlaef37g006x3u1c06gfdonp	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-06-01 00:00:00	f	2026-02-06 04:41:54.139
cmlaef387006z3u1cz8ssldp9	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-06-02 00:00:00	f	2026-02-06 04:41:54.139
cmlaef38q00713u1cc0sqznvq	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-06-03 00:00:00	f	2026-02-06 04:41:54.139
cmlaef39400733u1c4r813ktr	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-06-04 00:00:00	f	2026-02-06 04:41:54.139
cmlaef39c00753u1c4e1qcl13	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-06-05 00:00:00	f	2026-02-06 04:41:54.139
cmlaef3dh00773u1cpkxjkuzg	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-12 00:00:00	f	2026-02-06 04:41:54.139
cmlaef3e000793u1cho9sn0tc	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-06-06 00:00:00	f	2026-02-06 04:41:54.139
cmlaef3ek007b3u1cn3rru9vo	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-13 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3ez007d3u1cgiy6pvz7	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-15 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3fg007f3u1cpy7re2jv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-14 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3jh007h3u1cbxauy7yd	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-16 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3jt007j3u1cypb6o1le	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-15 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3ke007l3u1c9hcim3cd	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-17 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3ku007n3u1cw3o33fe4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-16 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3lj007p3u1chenu77nb	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-18 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3pm007t3u1c0dcpq7ch	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-19 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3pi007r3u1c5b6wpcd8	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-17 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3q8007v3u1cjd5l4ahh	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-18 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3qp007x3u1cvixtrmm4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-20 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3rm007z3u1c0fs0ejcg	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-19 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3vf00813u1ci7rd52nc	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-21 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3vi00833u1cbpdbk5b4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-20 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3w200853u1ccod5ysjb	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-22 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3wk00873u1czn8jrzg4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-21 00:00:00	f	2026-02-06 04:41:54.14
cmlaef3xr00893u1cvgr3tsfd	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-23 00:00:00	f	2026-02-06 04:41:54.14
cmlaef418008b3u1cyrmyi2jd	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-22 00:00:00	f	2026-02-06 04:41:54.14
cmlaef41i008d3u1ci0o74qjs	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-24 00:00:00	f	2026-02-06 04:41:54.14
cmlaef41w008f3u1c00n60d52	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-23 00:00:00	f	2026-02-06 04:41:54.14
cmlaef42f008h3u1cd6ar2dlx	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-25 00:00:00	f	2026-02-06 04:41:54.14
cmlaef43u008j3u1ca0wq3e8n	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-24 00:00:00	f	2026-02-06 04:41:54.14
cmlaef471008l3u1c2rig5if3	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-26 00:00:00	f	2026-02-06 04:41:54.14
cmlaef47i008n3u1c21ju3fuu	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-25 00:00:00	f	2026-02-06 04:41:54.14
cmlaef6nj00ct3u1cdqm01l1l	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-19 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6o700cv3u1ctpzowmfr	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-20 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6q200cx3u1cfgz4xfjv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-11-19 00:00:00	f	2026-02-06 04:41:54.143
cmlaiviiy001h34n087fo0uic	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-20 00:00:00	f	2026-02-06 06:46:42.901
cmlaivijj001j34n0mklkyn1i	cml6ctv270009uqrg7spxr9d4	cml66dlno000113mih77suyuc	2026-02-21 00:00:00	f	2026-02-06 06:46:42.901
cmlaiztg8001l34n002nap4ka	cml6ctv3c000buqrguslcci85	cml66dlno000113mih77suyuc	2026-02-01 00:00:00	f	2026-02-06 06:50:04.932
cmlaj25lz001t34n08vm3qfki	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-02 00:00:00	f	2026-02-06 06:51:53.999
cmlaj25m1001v34n0jx6f990l	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-15 00:00:00	f	2026-02-06 06:51:53.999
cmlaj25xn002334n0h4uo1wx4	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-18 00:00:00	f	2026-02-06 06:51:53.999
cmlaef47q008p3u1cv0w6md8m	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-27 00:00:00	f	2026-02-06 04:41:54.14
cmlaef48a008r3u1cpcckf98k	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-26 00:00:00	f	2026-02-06 04:41:54.14
cmlaef49x008t3u1cp1jmxrou	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-28 00:00:00	f	2026-02-06 04:41:54.14
cmlaef4cu008v3u1cp4v74aqv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-27 00:00:00	f	2026-02-06 04:41:54.14
cmlaef4dq008z3u1ciqw8sr1w	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-28 00:00:00	f	2026-02-06 04:41:54.14
cmlaef4dq008x3u1ccfpq2udm	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-29 00:00:00	f	2026-02-06 04:41:54.14
cmlaef4e500913u1c5nulgmr8	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-29 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4g100933u1c5bphyt52	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-30 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4in00953u1cubz13r6l	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-07-31 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4jk00973u1c6f17aknx	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-01 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4jr00993u1cpcylcg8a	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-30 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4k0009b3u1c7rjxsstb	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-02 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4m4009d3u1cay4t2a9d	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-03 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4og009f3u1c9of5lpke	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-04 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4pf009h3u1clqd42cgh	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-05 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4pu009l3u1cjfvtoh48	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-07 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4pr009j3u1coo8tr2ua	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-06 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4s8009n3u1c86b7jw4k	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-08 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4ua009p3u1chmq7ifei	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-09 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4v9009r3u1c17mpo8ez	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-10 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4vq009t3u1cw46aryqr	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-11 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4vr009v3u1cr3md5js7	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-12 00:00:00	f	2026-02-06 04:41:54.141
cmlaef4yc009x3u1cuarjshz2	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-01 00:00:00	f	2026-02-06 04:41:54.141
cmlaef505009z3u1cskjhdudt	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-13 00:00:00	f	2026-02-06 04:41:54.141
cmlaef51300a13u1c197ezxrb	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-14 00:00:00	f	2026-02-06 04:41:54.141
cmlaef51l00a33u1cskaeujvl	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-15 00:00:00	f	2026-02-06 04:41:54.141
cmlaef51s00a53u1cbvutqi0g	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-16 00:00:00	f	2026-02-06 04:41:54.141
cmlaef54f00a73u1c518xpsyv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-17 00:00:00	f	2026-02-06 04:41:54.141
cmlaef55y00a93u1cg5610ozi	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-18 00:00:00	f	2026-02-06 04:41:54.141
cmlaef56z00ab3u1c09ujqopy	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-19 00:00:00	f	2026-02-06 04:41:54.141
cmlaef57g00ad3u1c30meya14	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-20 00:00:00	f	2026-02-06 04:41:54.141
cmlaef57s00af3u1crg625xuy	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-21 00:00:00	f	2026-02-06 04:41:54.141
cmlaef5aj00ah3u1cd5x5n2nc	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-22 00:00:00	f	2026-02-06 04:41:54.141
cmlaef5bs00aj3u1c89j0q0em	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-23 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5ct00al3u1cqkvrdtc2	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-02 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5db00an3u1cnkkint6p	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-24 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5ds00ap3u1cjovcd51o	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-25 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5gn00ar3u1czd61ds6i	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-26 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5hl00at3u1c9ivu5cap	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-27 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5in00av3u1cxsquqsv1	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-28 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5j600ax3u1cpltion5k	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-29 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5jt00az3u1cf5lqbbff	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-30 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5mq00b13u1c2krbdgb4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-08-31 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5ne00b33u1cvpq1ouon	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-01 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5oh00b53u1c64j93aha	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-02 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5p100b73u1cnsnp6w2w	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-03 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5q000b93u1czmgpbhjt	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-03 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5su00bb3u1czukn3amb	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-04 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5t700bd3u1cktic0bwf	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-05 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5uc00bf3u1cavl6rfch	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-06 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5uw00bh3u1c4tzzla4q	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-07 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5w000bj3u1c1789ja5h	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-08 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5yz00bn3u1cqzhhpea2	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-10 00:00:00	f	2026-02-06 04:41:54.142
cmlaef5yx00bl3u1cceyrz8dl	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-09 00:00:00	f	2026-02-06 04:41:54.142
cmlaef60600bp3u1czbiu5ofh	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-11 00:00:00	f	2026-02-06 04:41:54.142
cmlaef60s00br3u1cf0onmim8	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-12 00:00:00	f	2026-02-06 04:41:54.142
cmlaef62100bt3u1c2jyf9b1v	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-13 00:00:00	f	2026-02-06 04:41:54.142
cmlaef64s00bv3u1cywz70qvy	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-09-14 00:00:00	f	2026-02-06 04:41:54.142
cmlaef65100bx3u1cmqnlnwus	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-04 00:00:00	f	2026-02-06 04:41:54.142
cmlaef66000bz3u1c49ne67pr	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-05 00:00:00	f	2026-02-06 04:41:54.142
cmlaef66n00c13u1cbmm4w2o9	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-06 00:00:00	f	2026-02-06 04:41:54.143
cmlaef68100c33u1cxyyok99r	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-07 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6al00c53u1cyq1ldy81	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-08 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6b400c73u1cnt3klm42	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-09 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6bu00c93u1c6pszpbcv	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-11-18 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6ch00cb3u1cpeyt3zge	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-10 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6e100cd3u1card5wy30	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-11 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6gf00cf3u1ckwvbkena	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-12 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6h700ch3u1ctwgoo6u3	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-13 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6ho00cj3u1cbao3buu2	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-14 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6ic00cl3u1cndyaqaq0	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-15 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6k100cn3u1cqxm4bolb	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-16 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6m800cp3u1c4r60b52e	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-17 00:00:00	f	2026-02-06 04:41:54.143
cmlaef6nb00cr3u1cq7mp8nr4	cml6ctv90000luqrg6v3qvfs7	cmlaedp0q00013u1cyzjfudkd	2026-10-18 00:00:00	f	2026-02-06 04:41:54.143
cmlaj25fy001p34n03yh3b0bs	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-01 00:00:00	f	2026-02-06 06:51:53.998
cmlaj25fy001n34n048j95fun	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-01-31 00:00:00	f	2026-02-06 06:51:53.998
cmlaj25lz001r34n0cgdegr4a	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-16 00:00:00	f	2026-02-06 06:51:53.999
cmlaj25rr001x34n03bp0hc91	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-03 00:00:00	f	2026-02-06 06:51:53.999
cmlaj25ru001z34n0saah7bu1	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-17 00:00:00	f	2026-02-06 06:51:53.999
cmlaj25rw002134n0j6arusd9	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-04 00:00:00	f	2026-02-06 06:51:53.999
cmlaj25xt002934n0qz9ff4y9	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-06 00:00:00	f	2026-02-06 06:51:53.999
cmlaj25y2002b34n02p0h7rp3	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-20 00:00:00	f	2026-02-06 06:51:53.999
cmlaj263i002d34n0qpiatmum	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-07 00:00:00	f	2026-02-06 06:51:53.999
cmlaj263o002f34n068bxdlo0	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-21 00:00:00	f	2026-02-06 06:51:53.999
cmlaj263q002h34n04bp754uf	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-08 00:00:00	f	2026-02-06 06:51:53.999
cmlaj263r002j34n0t7eew165	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-22 00:00:00	f	2026-02-06 06:51:53.999
cmlaj2643002l34n0u49osruh	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-09 00:00:00	f	2026-02-06 06:51:54
cmlaj269e002n34n0x68yqjbd	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-23 00:00:00	f	2026-02-06 06:51:54
cmlaj269l002p34n0yri1f7cg	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-10 00:00:00	f	2026-02-06 06:51:54
cmlaj269n002r34n0jb5f1tsq	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-24 00:00:00	f	2026-02-06 06:51:54
cmlaj269p002t34n04kdi80dj	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-27 00:00:00	f	2026-02-06 06:51:54
cmlaj26ae002v34n0ymnewu8h	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-11 00:00:00	f	2026-02-06 06:51:54
cmlaj26fa002x34n09igqpba5	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-25 00:00:00	f	2026-02-06 06:51:54
cmlaj26fi002z34n0smj1zwir	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-12 00:00:00	f	2026-02-06 06:51:54
cmlaj26fk003134n0gs7mmgfs	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-13 00:00:00	f	2026-02-06 06:51:54
cmlaj26fm003334n0gwgxujlz	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-26 00:00:00	f	2026-02-06 06:51:54
cmlaj26gf003534n0hi99x0nn	cml6ctuzt0005uqrgdnihhrcg	cml66dlno000113mih77suyuc	2026-02-14 00:00:00	f	2026-02-06 06:51:54
cmlaj3fsj003d34n0hd8dndpo	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-02 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fsm003f34n0ndr4ot1q	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-04 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fso003h34n0oneve051	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-16 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fyd003j34n0j6nua32o	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-17 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3fyg003l34n0e8l4si1u	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-05 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3g4d003x34n0oho6t3ac	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-06 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3g4h003z34n0ypoggej8	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-26 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3g4r004134n0n61ovyo1	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-25 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3ga4004334n0oeqt1i32	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-07 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3gaa004534n0hl46ugs0	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-21 00:00:00	f	2026-02-06 06:52:53.856
cmlaj3gg7004h34n06gp2e5be	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-10 00:00:00	f	2026-02-06 06:52:53.857
cmlaj3ggc004j34n0h2cfml1v	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-12 00:00:00	f	2026-02-06 06:52:53.857
cmlaj3ggu004l34n01z5fqwo6	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-11 00:00:00	f	2026-02-06 06:52:53.857
cmlaj3glv004n34n0lyg99r9w	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-13 00:00:00	f	2026-02-06 06:52:53.857
cmlaj3gm4004p34n0ybsyjqo6	cml6ctuyp0003uqrgejbtvcmm	cml66dlrp000413miapldg649	2026-02-14 00:00:00	f	2026-02-06 06:52:53.857
cmlaj4rnf004r34n0luildbrc	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-01-31 00:00:00	f	2026-02-06 06:53:56.091
cmlaj4rtg005134n00xzx9tia	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-03 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4rz7005334n0vicl0g96	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-04 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4rz9005534n04sr67s88	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-05 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4rzb005934n0gmbhthkp	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-09 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4rza005734n0144o2ew5	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-08 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4rzh005b34n03uvwpx7m	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-10 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4s52005d34n0uk8pkore	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-19 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4s56005f34n01cn42216	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-11 00:00:00	f	2026-02-06 06:53:56.093
cmlaj4s58005h34n0wigg8etj	cml6cuiw70001zj29jbewbh4e	cml7q816x0000w66jefyem7i4	2026-02-12 00:00:00	f	2026-02-06 06:53:56.093
cmlaj9t52006r34n0621ojylc	cml6ctvb9000puqrgafxo42i7	cml6e4r7d0005iqihai8hkhn8	2026-02-05 00:00:00	f	2026-02-06 06:57:51.09
cmlaj9t58006t34n0d9wn946r	cml6ctvb9000puqrgafxo42i7	cml6e4r7d0005iqihai8hkhn8	2026-02-03 00:00:00	f	2026-02-06 06:57:51.09
cmlaj9t5b006v34n055vpc8up	cml6ctvb9000puqrgafxo42i7	cml6e4r7d0005iqihai8hkhn8	2026-02-04 00:00:00	f	2026-02-06 06:57:51.089
cmlaj9taw006x34n0pcirn4wy	cml6ctvb9000puqrgafxo42i7	cml6e4r7d0005iqihai8hkhn8	2026-02-06 00:00:00	f	2026-02-06 06:57:51.09
cmlaj9tb1006z34n0ujxb8li2	cml6ctvb9000puqrgafxo42i7	cml6e4r7d0005iqihai8hkhn8	2026-02-08 00:00:00	f	2026-02-06 06:57:51.09
cmlaj9tbc007134n0u1kxgkd7	cml6ctvb9000puqrgafxo42i7	cml6e4r7d0005iqihai8hkhn8	2026-02-07 00:00:00	f	2026-02-06 06:57:51.09
cmlvupf9a001z9q91net58x54	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-01-25 17:00:00	t	2026-02-21 05:01:05.054
cmlvuqeh800219q91pto1j0y8	cml6ctvwy001xuqrgl2hwd8y1	cml66dlkw000013mitod5upug	2026-01-24 17:00:00	t	2026-02-21 05:01:50.925
cml66dm1x000g13mig1wuucu2	cml5g289u003uua47ulssk26x	cml66dluc000613miw0vgbha7	2026-01-31 17:00:00	f	2026-02-03 05:45:49.029
cmlx75k12004vqi9u0i3zt1px	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-01-31 00:00:00	f	2026-02-22 03:37:19.313
cml97kcie0003be3gxfgqjayd	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-01 00:00:00	f	2026-02-05 08:42:21.398
cmlx75kjy005fqi9u5inigqdi	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-07 00:00:00	f	2026-02-22 03:37:19.314
cmlx75kjw005dqi9uzldr4i94	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-21 00:00:00	f	2026-02-22 03:37:19.314
cmlx75l5t0067qi9ujmd50fdr	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-28 00:00:00	f	2026-02-22 03:37:19.315
cmlx75l6h0069qi9ud2pcgljp	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-02-14 00:00:00	f	2026-02-22 03:37:19.315
cmlx75l6t006bqi9ufo7jrhvb	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-03-01 00:00:00	f	2026-02-22 03:37:19.315
cmlx75l8r006fqi9uftzotgzg	cml5g1qzg000iua472zcpgugd	cml66dlkw000013mitod5upug	2026-03-02 00:00:00	f	2026-02-22 03:37:19.315
\.


--
-- Data for Name: ShiftPattern; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShiftPattern" (id, name, "departmentId", month, year, "isActive", "patternData", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ShiftPool; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShiftPool" (id, "shiftId", date, "releasedBy", "claimedBy", reason, status, "bonusAmount", "claimedAt", "expiredAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ShiftSwap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShiftSwap" (id, "requesterId", "targetId", "requesterDate", "targetDate", reason, status, "targetAccepted", "approvedBy", "approvedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ShiftTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShiftTemplate" (id, name, description, shifts, "stationId", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SpecialIncome; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SpecialIncome" (id, "userId", date, "shiftId", "stationId", type, description, "salesAmount", percentage, amount, status, "approvedBy", "approvedAt", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Station; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Station" (id, name, code, type, address, latitude, longitude, radius, "wifiSSID", "qrCode", "isActive", "createdAt", "updatedAt") FROM stdin;
cml9fdlx200001xs1ucicn8js	แก๊สพงษ์อนันต์	GASP	GAS_STATION		16.454723578831520000000000000000	99.530484729938640000000000000000	50	\N	GASP-2026	t	2026-02-05 12:21:03.927	2026-02-05 12:21:03.927
cml5by908000114m6el6np1dp	พงษ์อนันต์ปิโตรเลียม	PAP	GAS_STATION	พงษ์อนันต์ปิโตรเลียม	16.455180000000000000000000000000	99.530100000000000000000000000000	80		PAP-2026-ML6DZOKO	t	2026-02-03 04:16:58.7	2026-02-23 01:57:51.023
cml5by92t000214m6ta5q3o28	ศุภชัยบริการ	SPC	GAS_STATION	ศุภชัยบริการ	16.436350000000000000000000000000	99.511780000000000000000000000000	80		SPC-2026-ML6DZRWT	t	2026-02-03 04:16:58.755	2026-02-23 01:58:08.461
cml5by818000014m683rzadum	วัชรเกียรติออยล์	WKO	GAS_STATION	วัชรเกียรติออยล์	16.475306395999480000000000000000	99.553487514710600000000000000000	100		WKO-2026-ML6465IW	t	2026-02-03 04:16:58.591	2026-02-23 01:58:20.933
\.


--
-- Data for Name: SystemConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemConfig" (id, key, value, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TimeCorrection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimeCorrection" (id, "userId", date, "requestType", "requestedTime", reason, "originalCheckIn", "originalCheckOut", status, "approvedBy", "approvedAt", "createdAt", "updatedAt") FROM stdin;
cml7pn03s000b14lz904m0juy	cml6ctvwy001xuqrgl2hwd8y1	2026-02-04 00:00:00	CHECK_IN	2026-02-04 05:30:00	พึ่งลอง	2026-02-04 07:16:31.619	\N	REJECTED	cml5bye4s003o14m6o7nvf35u	2026-02-04 08:32:27.443	2026-02-04 07:32:46.024	2026-02-04 08:32:27.444
cml9esna20005dun898b4pkg4	cml6ctvb9000puqrgafxo42i7	2026-02-05 00:00:00	CHECK_IN	2026-02-05 19:00:00	เข้าผิด	2026-02-04 23:20:58.568	2026-02-05 12:03:37.061	APPROVED	cml61rz7u000111dofdoy94sd	2026-02-05 12:18:56.275	2026-02-05 12:04:45.914	2026-02-05 12:18:56.276
cmlbq8slr0003qafd09xqz6k5	cml6ctvwy001xuqrgl2hwd8y1	2026-02-07 00:00:00	CHECK_IN	2026-02-07 08:00:00	ลืมกดเข้าเวร	\N	\N	APPROVED	cml61rz7u000111dofdoy94sd	2026-02-07 03:42:47.939	2026-02-07 03:00:47.44	2026-02-07 03:42:47.94
cmld5r6ji0001ky2lqormtvgm	cml6ctvwy001xuqrgl2hwd8y1	2026-02-08 00:00:00	CHECK_IN	2026-02-08 01:00:00	ลืมกดเข้าเวร	2026-02-07 23:22:33.641	\N	APPROVED	cml61rz7u000111dofdoy94sd	2026-02-08 03:29:52.307	2026-02-08 03:02:45.727	2026-02-08 03:29:52.308
cmldu804e0001vc7wc2f6n7xt	cml6ctv7w000juqrgh1tdiejn	2026-02-08 00:00:00	CHECK_OUT	2026-02-08 06:30:00	ลืมค่ะ	2026-02-07 23:19:15.707	2026-02-08 14:27:10.213	APPROVED	cml61rz7u000111dofdoy94sd	2026-02-09 07:17:29.906	2026-02-08 14:27:41.342	2026-02-09 07:17:29.907
cmlfbixxg0001f7h7xhvbvorl	cml6ctv7w000juqrgh1tdiejn	2026-02-09 00:00:00	CHECK_OUT	2026-02-09 15:20:00	..	2026-02-09 05:53:53.735	2026-02-08 06:30:00	PENDING	\N	\N	2026-02-09 15:19:51.364	2026-02-09 15:19:51.364
cmlfbw1530003f7h7qx39bdtp	cml6ctv5n000fuqrg94t826wg	2026-02-09 00:00:00	CHECK_IN	2026-02-09 01:00:00	ลืมกด	2026-02-09 11:10:32.203	2026-02-09 15:01:53.671	PENDING	\N	\N	2026-02-09 15:30:02.056	2026-02-09 15:30:02.056
cmlh83hdd0005f7ksklkxgyrd	cml6ctv5n000fuqrg94t826wg	2026-02-11 00:00:00	CHECK_OUT	2026-02-10 23:19:00	ลืมกด	\N	\N	PENDING	\N	\N	2026-02-10 23:19:23.57	2026-02-10 23:19:23.57
cmlll9fiq0003ods0jh0aavrz	cml5g1xzx001oua47iy5u23oh	2026-02-14 00:00:00	CHECK_IN	2026-02-13 23:30:00	กดเข้าไม่ได้	2026-02-14 00:38:21.194	\N	PENDING	\N	\N	2026-02-14 00:39:00.818	2026-02-14 00:39:00.818
cmlr7x5i300015z4puvwtj446	cml6ctv7w000juqrgh1tdiejn	2026-02-17 00:00:00	CHECK_OUT	2026-02-17 06:30:00	ลืม	2026-02-16 23:10:47.941	2026-02-17 23:08:39.538	PENDING	\N	\N	2026-02-17 23:12:10.011	2026-02-17 23:12:10.011
cmlviflhn000h11byc6sxk039	cml6ctv7w000juqrgh1tdiejn	2026-02-20 00:00:00	CHECK_OUT	2026-02-20 06:30:00	ลืม	2026-02-19 23:11:08.968	2026-02-20 23:10:43.854	PENDING	\N	\N	2026-02-20 23:17:31.403	2026-02-20 23:17:31.403
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "employeeId", username, name, email, phone, pin, password, role, "stationId", "departmentId", "deviceId", "photoUrl", "hourlyRate", "dailyRate", "baseSalary", "otRateMultiplier", "isActive", "employeeStatus", "createdAt", "updatedAt", address, "bankAccountNumber", "bankName", "birthDate", "citizenId", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", gender, "isSocialSecurityRegistered", "nickName", "probationEndDate", "registeredStationId", "socialSecurityNumber", "startDate") FROM stdin;
cmlm76c5y0001vdciu64hkooq	JPT	เก่ง	เก่ง	\N	\N	$2b$10$FSSoVybmfpMVO3k7HZ7Dn.3EzqHWdi7L1bzOW08eQ9X2W5dF91u0O	$2b$10$StU3ebLq.zry1C1IlW6Qc..Ek2gQsBBeu686kup6lCAmYSVykx5xG	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb2h001514m6oezn2e06	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-14 10:52:28.054	2026-02-14 10:52:28.054	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	เก่ง	\N	\N	\N	2026-02-14 00:00:00
cml5byep0004014m6bu0geabi	EMP003	\N	ประสิทธิ์ แข็งแกร่ง	\N	0811111113	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byadq000l14m6nbtshtco	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	f	RESIGNED	2026-02-03 04:16:59.862	2026-02-04 08:33:30.878	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml5byeqt004214m6opnwwhgx	EMP004	\N	มานะ อดทน	\N	0811111114	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaor000t14m6ik3csf83	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	f	RESIGNED	2026-02-03 04:16:59.914	2026-02-04 08:33:30.878	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctv3c000buqrguslcci85	EMPC1CD8	\N	สุวรรณา คำเมฆ	\N	0933058090	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb2h001514m6oezn2e06	-xkcrlf	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:24.936	2026-02-04 23:13:05.936	\N	7852186910.0	\N	\N	\N	\N	\N	\N	\N	t	ต้อย	\N	cml5by908000114m6el6np1dp	\N	2026-02-04 03:41:17.179
cml6ctuzt0005uqrgdnihhrcg	EMPABC9E	\N	สุกัญญา ซุยพวง	\N	0996581685	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb2h001514m6oezn2e06	-tvo3gw	\N	26.666666666666670000000000000000	320.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:24.809	2026-02-04 23:16:31.335	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	เมย์	\N	\N	\N	2026-02-04 03:41:17.179
cmlbx8f1n0001qz177uch66i0	WKB	บีบี	บีบี	\N	\N	$2b$10$ovpvfOeG1yuQal4E8ayc/OxrK7RwBXAEhf.sX4wTsFM2rrUM3Vuqy	$2b$10$kE5V22iOzeGuVeR40a4CDeyG6YtmdNwQYC0ZjQ1eLaM4N9/9KhCbq	EMPLOYEE	cml5by818000014m683rzadum	cml5byalg000p14m6f61bwm82	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-07 06:16:27.179	2026-02-07 06:16:27.179	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	บีบี	\N	\N	\N	2026-02-07 00:00:00
cml5g1qzg000iua472zcpgugd	FYF1E65	\N	ศราวุฒ มาน้อย	\N	0642061095	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5bya6x000h14m6lysk7qbh	-8s2lny	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.717	2026-02-04 07:13:16.224	\N	7852186431.0	\N	\N	\N	\N	\N	\N	\N	f	วุฒิ	\N	\N	\N	2026-02-04 03:41:17.179
cml61rz7u000111dofdoy94sd	admin	admin	benz	\N	0956965955	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	ADMIN	cml5by818000014m683rzadum	\N	-a7615o	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:01.125	2026-02-04 08:12:50.594	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctuyp0003uqrgejbtvcmm	EMP5B275	\N	พงษ์พิพัฒน์ นันทลักษณ์	\N	0954592173	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb6k001914m6zzl1yjdo	-w9hfrz	\N	25.833333333333330000000000000000	310.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:24.769	2026-02-05 01:06:39.264	\N	7852186852.0	\N	\N	\N	\N	\N	\N	\N	f	เซ็น	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctva5000nuqrg8wh05sro	EMPF7DE0	\N	สราวุธ เครือวัลย์	\N	0803511665	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	CASHIER	cml5by92t000214m6ta5q3o28	cml5byb4f001714m6fozklfm3	-68ibx1	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	10500.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.181	2026-02-05 12:26:28.967	\N	7852186894.0	\N	\N	\N	\N	\N	\N	\N	t	เหน่ง	\N	cml5by92t000214m6ta5q3o28	\N	2026-02-04 03:41:17.179
cml5cwfpj0001v68q0h16va0v	admin02	bee	bee	\N	0952651556	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	HR	cml5by818000014m683rzadum	\N	-x0jg9j	\N	60.000000000000000000000000000000	400.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.423	2026-02-03 14:44:46.883	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml6cuiw70001zj29jbewbh4e	EMP0999C	\N	เท เท	\N	000-000-0000	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5bybav001d14m6edtplh6i	\N	\N	31.000000000000000000000000000000	310.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:55.783	2026-02-04 06:40:16.656	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	เท	\N	\N	\N	2026-02-04 03:41:17.179
cml5g1tky000wua47qqpf53wn	FYE53AD	\N	ปรีชา คงเทพ	\N	09bfdf56a9	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5g1o4u0002ua47camd41dk	-zcd007	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.976	2026-02-05 02:04:51.617	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	ชล	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvkk0015uqrg9iuy6dh1	EMPE2D20	\N	ธัญวรัตน์ สันคะยอม	\N	0846228470	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	CASHIER	cml5by908000114m6el6np1dp	cml5byas8000x14m66o2b3vd3	phfpd5	\N	41.250000000000000000000000000000	330.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.556	2026-02-06 22:27:46.647	\N	7852186837.0	\N	\N	\N	\N	\N	\N	\N	t	กุ้ง	\N	cml5by908000114m6el6np1dp	\N	2026-02-04 03:41:17.179
cml6ctvb9000puqrgafxo42i7	EMPC6A4F	\N	คะนอง ใจแสน	\N	0986884227	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	CASHIER	cml5by92t000214m6ta5q3o28	cml5byb4f001714m6fozklfm3	-xgf12i	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.221	2026-02-10 07:51:02.321	\N	7852187033.0	\N	\N	\N	\N	\N	\N	\N	t	ปุ้ก	\N	cml5by92t000214m6ta5q3o28	\N	2026-02-04 00:00:00
cml5bye4s003o14m6o7nvf35u	ADM001	\N	ผู้ดูแลระบบ	admin@supachai.com	0800000001	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$s6Gd98aDHnp.qkMnDR10sODjO/KvDawIoN7UwDHYFMKAFQpL7kBVS	ADMIN	\N	\N	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.12	2026-02-04 05:25:59.214	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml5byewd004814m6bn4bkxk2	EMP007	\N	กัญญา สดใส	\N	0811111117	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb2h001514m6oezn2e06	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	f	RESIGNED	2026-02-03 04:17:00.068	2026-02-04 08:33:30.878	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml5byesm004414m6djc3gy9l	EMP005	\N	สุนีย์ รอบคอบ	\N	0811111115	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaqg000v14m6yck5lb4i	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	f	RESIGNED	2026-02-03 04:16:59.969	2026-02-04 08:33:30.878	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml5byeun004614m6ubhat2ky	EMP006	\N	ธนา เจริญ	\N	0811111116	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byas8000x14m66o2b3vd3	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	f	RESIGNED	2026-02-03 04:17:00.02	2026-02-04 08:33:30.878	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvcw000tuqrgj8clzpzz	EMPC302D	\N	กรวรรณ ศรีภุมมา	\N	0840620264	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	CASHIER	cml5by908000114m6el6np1dp	cml5byas8000x14m66o2b3vd3	-oj16l7	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	10500.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.28	2026-02-06 22:31:02.039	\N	7852186795.0	\N	\N	\N	\N	\N	\N	\N	t	ติว	\N	cml5by908000114m6el6np1dp	\N	2026-02-04 03:41:17.179
cml6ok3650001fcvg3menyegc	EMP08422399	เนส	เนส	\N	temp-28084223454	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	\N	\N	\N	26.666666666666670000000000000000	320.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 14:14:44.233	2026-02-03 15:10:33.185	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml5byecm003q14m6ky0hwtxz	MGR001	\N	ผู้จัดการวัชรเกียรติ	manager.wko@supachai.com	0800000002	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	MANAGER	cml5by818000014m683rzadum	\N	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.173	2026-02-03 04:17:00.173	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml5byeg3003s14m68qd8wswv	MGR002	\N	ผู้จัดการพงษ์อนันต์	manager.pap@supachai.com	0800000003	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	MANAGER	cml5by908000114m6el6np1dp	\N	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.226	2026-02-03 04:17:00.226	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml5byehv003u14m64ih3x3rx	MGR003	\N	ผู้จัดการศุภชัย	manager.spc@supachai.com	0800000004	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	MANAGER	cml5by92t000214m6ta5q3o28	\N	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.275	2026-02-03 04:17:00.275	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvhm0011uqrgd2s6gv12	EMPE5453	\N	saw kyaw saw	\N	0948941260	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaor000t14m6ik3csf83	g6sqmk	\N	43.375000000000000000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.451	2026-02-05 06:42:47.489	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	น้ำ	\N	cml5by908000114m6el6np1dp	\N	2026-02-04 03:41:17.179
cml6ctv90000luqrg6v3qvfs7	EMP075A5	\N	ณรงค์ สิงโต	\N	0839571427	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	CASHIER	cml5by92t000214m6ta5q3o28	cml5byb4f001714m6fozklfm3	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	10500.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.141	2026-02-04 05:50:38.995	\N	7852187058.0	\N	\N	\N	\N	\N	\N	\N	t	รงค์	\N	cml5by92t000214m6ta5q3o28	\N	2026-02-04 03:41:17.179
cml6ctv5n000fuqrg94t826wg	EMPB49E7	\N	ประสิทธิ์ ราศี	\N	0888563364	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb2h001514m6oezn2e06	jzx37b	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.019	2026-02-05 11:42:00.155	\N	7852186936.0	\N	\N	\N	\N	\N	\N	\N	f	ตั้ม	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvgi000zuqrguiuyi2de	EMPB63BB	\N	นิตยา สอนคำ	\N	0953350658	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaor000t14m6ik3csf83	-1n18s4	\N	43.375000000000000000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.411	2026-02-05 10:10:57.353	\N	7852186597.0	\N	\N	\N	\N	\N	\N	\N	t	นิด	\N	cml5by92t000214m6ta5q3o28	\N	2026-02-04 03:41:17.179
cml6ctvnx001buqrgfzjexn6r	EMPC7B24	\N	บุญมี สุขกาย	\N	0950059664	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byatw000z14m60a0nrjoz	-3nueuy	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	12000.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.677	2026-02-05 22:54:52.604	\N	7852186738.0	\N	\N	\N	\N	\N	\N	\N	t	กฐิน	\N	cml5by92t000214m6ta5q3o28	\N	2026-02-04 03:41:17.179
cml6ctv7w000juqrgh1tdiejn	EMPE0600	\N	เพ็ญศิริ แช่มศิริ	\N	0619291301	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	CASHIER	cml5by92t000214m6ta5q3o28	cml5byb4f001714m6fozklfm3	rcqple	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	10500.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.1	2026-02-07 06:16:58.465	\N	7852186951.0	\N	\N	\N	\N	0619291301	\N	\N	t	ปีใหม่	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
cml5g1vmh001aua47rlxc2pr1	FYC641B	\N	zow tune tune	\N	09e639aaff	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5g1o4u0002ua47camd41dk	2hlpr1	\N	28.916666666666670000000000000000	0.000000000000000000000000000000	10300.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.766	2026-02-04 08:06:30.247	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	บี	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvms0019uqrg4ft54y7j	EMP07358	\N	เอ็ม เอ็ม	\N	0829848258	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaqg000v14m6yck5lb4i	-1n18s4	\N	38.750000000000000000000000000000	310.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.637	2026-02-05 13:36:58.644	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	เอ็ม	\N	\N	\N	2026-02-04 03:41:17.179
cml5g20im0022ua4780xu5bou	FYC1C14	\N	สุนันทา สุขสว่าง	\N	0968522976	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5bya6x000h14m6lysk7qbh	-8s2lny	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.872	2026-02-04 07:21:38.067	\N	7852188866.0	\N	\N	\N	\N	\N	\N	\N	t	หญิง	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
cml5g289u003uua47ulssk26x	FY20CC2	\N	จิรวัฒน์	\N	0613144507	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5bya6x000h14m6lysk7qbh	-a7615o	\N	26.666666666666670000000000000000	320.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.919	2026-02-04 05:50:41.8	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	กราฟ	\N	\N	\N	2026-02-04 03:41:17.179
cml5g1orx0004ua47946isqic	FYBEEC7	\N	นัทธิติ ดวงคำ	\N	095e7d9ce8	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5g1o4u0002ua47camd41dk	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.67	2026-02-04 06:40:16.38	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	หนิง	\N	\N	\N	2026-02-04 03:41:17.179
cml5waf57000114p7u4pb0j1l	lube1	เผือก	ประจบ ทองสัมฤทธิ์	\N	0850531397	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byaga000n14m6f7mxdl6d	4uyosu	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	11300.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.622	2026-02-05 02:19:20.789	\N	7852186399.0	\N	\N	\N	\N	\N	\N	\N	t	เผือก	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
cml5byeyf004a14m6296hduaj	EMP008	\N	พิชัย ฉลาด	\N	0811111118	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb4f001714m6fozklfm3	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	f	RESIGNED	2026-02-03 04:17:00.324	2026-02-04 08:33:30.878	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml5cxygj0003v68ql9533bl3	wk01	โสรดา	โสรดา สมผะเดิม	\N	0812345678	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	MANAGER	cml5by818000014m683rzadum	cml5byaaj000j14m6lxzgng16	-wfhbzg	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.471	2026-02-04 07:13:10.568	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	โส	\N	\N	\N	2026-02-04 03:41:17.179
cml5byf08004c14m6korakkr4	EMP009	\N	รัตนา อ่อนโยน	\N	0811111119	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb6k001914m6zzl1yjdo	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	f	RESIGNED	2026-02-03 04:17:00.373	2026-02-04 08:33:30.878	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml61sv4d000311dovjh6696v	admin03	หนิง	หนิง	\N	012345678	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	HR	cml5by818000014m683rzadum	\N	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	14000.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:01.074	2026-02-03 15:10:32.552	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvqa001huqrgn8fa8qe5	EMP93223	\N	ปื๊ด ปื๊ด	\N	0613508731	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaxw001114m65wcpjck4	g3up74	\N	38.888888888888890000000000000000	350.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.763	2026-02-06 00:49:05.165	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	ปื๊ด	\N	\N	\N	2026-02-04 03:41:17.179
cml6cv8qd000113l7pz55vip3	EMP4B957	\N	ภัทราพร เหลาอ่อน	\N	0656375593	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	HR	cml5by908000114m6el6np1dp	cml5byas8000x14m66o2b3vd3	-xgf12i	\N	32.000000000000000000000000000000	320.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:47:29.269	2026-02-21 02:37:41.322	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	จ๋า 	\N	\N	\N	2026-02-04 00:00:00
cml6ctvff000xuqrgvuiy6k2z	EMP76265	\N	วราพร แดงอาจ	\N	0987185291	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaor000t14m6ik3csf83	\N	\N	43.375000000000000000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.371	2026-02-04 05:50:39.519	\N	7852186779.0	\N	\N	\N	\N	\N	\N	\N	t	น้อย	\N	cml5by92t000214m6ta5q3o28	\N	2026-02-04 03:41:17.179
cml6cv8w4000913l7imruilgz	EMPCED25	\N	saw mar young	\N	0000010875	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byan4000r14m6brmmru3m	-ote1eo	\N	35.000000000000000000000000000000	350.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:47:29.476	2026-02-09 02:00:51.357	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	ยาว	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvlp0017uqrgl43h68pm	EMP90026	\N	อนุชา เครือวัลย์	\N	0929930723	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	CASHIER	cml5by908000114m6el6np1dp	cml5byas8000x14m66o2b3vd3	-jkouny	\N	41.250000000000000000000000000000	330.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.597	2026-02-06 05:51:37.086	\N	7852186670.0	\N	\N	\N	\N	\N	\N	\N	t	เล็ก	\N	cml5by92t000214m6ta5q3o28	\N	2026-02-04 03:41:17.179
cml6ctv270009uqrg7spxr9d4	EMP66565	\N	ณรงค์ศักดิ์ วิชัยวงศ	\N	0988068489	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb2h001514m6oezn2e06	4uyosu	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:24.895	2026-02-14 05:14:08.833	\N	7852187074.0	\N	\N	\N	\N	\N	\N	\N	f	ปอ	\N	\N	\N	2026-02-04 03:41:17.179
cml6cv8ts000513l7uydg8j16	EMPC7F00	\N	สุภาวรรณ เมนกุลท์	\N	0988198330	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byalg000p14m6f61bwm82	-h2k8cv	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	10300.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:47:29.392	2026-02-07 23:55:17.614	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	จอย	\N	\N	\N	2026-02-04 03:41:17.179
cml6cv8uy000713l7zocqn0fn	EMP66DD8	\N	กุลยารัตน์ บุญรอด	\N	0948433133	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byadq000l14m6nbtshtco	-trvj2p	\N	41.250000000000000000000000000000	330.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:47:29.434	2026-02-04 07:32:12.837	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	หวาน	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvz80021uqrghd4qf3t2	EMP1C765	\N	สวงษ์	\N	0972956703	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byan4000r14m6brmmru3m	-trvj2p	\N	27.500000000000000000000000000000	330.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:26.084	2026-02-05 10:39:23.6	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	ยามเจก	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctv4g000duqrgdybgtyte	EMP7342D	\N	thein min	\N	0634848715	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb2h001514m6oezn2e06	-8y1m2y	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:24.977	2026-02-05 11:22:27.372	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	วิน	\N	cml5by92t000214m6ta5q3o28	\N	2026-02-04 03:41:17.179
cml6ctv0x0007uqrgprf5lu7c	EMP0799F	\N	ชลธิชา เนื้อไม้	\N	0918014556	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb2h001514m6oezn2e06	-85vz5c	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:24.849	2026-02-05 01:06:29.056	\N	7852186993.0	\N	\N	\N	\N	\N	\N	\N	t	กอล์ฟ	\N	cml5by908000114m6el6np1dp	\N	2026-02-04 03:41:17.179
cml6ctvsk001nuqrgooayfxde	EMP7F36E	\N	สำเภา จันทร์กระจ่าง	\N	0845750418	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byaga000n14m6f7mxdl6d	-xk7lgp	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	11300.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.845	2026-02-05 02:19:43.288	\N	7852186415.0	\N	\N	\N	\N	\N	\N	\N	t	เบิ้ม	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
cml6ctveb000vuqrg3ulgugaj	EMPB88A8	\N	อนุสรณ์ ยอดดำเนิน	\N	0639904633	$2b$10$BeixX0rkUhe3g4m5WfPJe.0KuquDNisa5nYH8ZXNdaeS337G1nqh.	$2b$10$phRcu4rDIfF52asa8swYPeV6EUl8pYw1xPoyHP4tRtxk2duzBRi7K	CASHIER	cml5by908000114m6el6np1dp	cml5byas8000x14m66o2b3vd3	-c3lq7g	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	10500.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.331	2026-02-07 06:17:11.204	\N	7852186712.0	อนุสรณ์ ยอดดำเนิน	\N	\N	\N	\N	\N	\N	f	กาย	\N	\N	\N	2026-02-04 03:41:17.179
cml6cv8xa000b13l74q8nffyl	EMP0589A	\N	ตาเรือง	\N	0000025365	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byan4000r14m6brmmru3m	\N	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:47:29.519	2026-02-04 06:40:17.353	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	ตาเรือง	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvtp001puqrgr6j1clm9	EMPC1933	\N	กระจี อนุสิทธิ์	\N	0985527883	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byalg000p14m6f61bwm82	4zl33m	\N	32.000000000000000000000000000000	320.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.885	2026-02-14 02:26:57.168	\N	7852186571.0	\N	\N	\N	\N	\N	\N	\N	t	แม่บ้านจี	\N	cml5by818000014m683rzadum	\N	2026-02-04 00:00:00
cml6ctvp6001fuqrgjo0cut8g	EMP72EF3	\N	วันแรก เลบสูงเนิน	\N	0935484511	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaxw001114m65wcpjck4	-ilt8ll	\N	38.888888888888890000000000000000	350.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.722	2026-02-09 00:49:15.035	\N	7852186654.0	\N	\N	\N	\N	\N	\N	\N	f	วันแรก	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctvwy001xuqrgl2hwd8y1	EMPE7FB0	\N	ณัชชา	\N	0994105248	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	CASHIER	cml5by908000114m6el6np1dp	cml5byas8000x14m66o2b3vd3	-wfhbzg	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:26.002	2026-02-21 02:25:00.811	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	นัชชา	\N	\N	\N	2026-02-04 00:00:00
cml5g22hz002gua47temxhj1t	FY3D660	\N	ศิริพร เอี่ยมแก้ว	\N	0660304162	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5bya6x000h14m6lysk7qbh	ccsx7a	\N	27.500000000000000000000000000000	330.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:01.024	2026-02-04 07:29:58.682	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	มะนาว	\N	\N	\N	2026-02-04 03:41:17.179
cml5g1xzx001oua47iy5u23oh	FYF3366	\N	สุภัสสรา สนนาม	\N	0992487157	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5bya6x000h14m6lysk7qbh	g3up74	\N	28.916666666666670000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.822	2026-02-04 08:09:42.215	\N	7852195952.0	\N	\N	\N	\N	\N	\N	\N	t	โบว์	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
cml6ctv6r000huqrg08xd4xcm	EMP59C17	\N	วัลลี โพธิ์ไกร	\N	0884297006	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$/AzYkFGdfyTO4UMgOfTadOTA6f9x3cp6F0wkuQA.gJxZcWOjnDil6	CASHIER	cml5by92t000214m6ta5q3o28	cml5byb4f001714m6fozklfm3	-bj8nbo	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	10500.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.06	2026-02-04 09:31:10.924	\N	7852187017.0	\N	\N	\N	\N	\N	\N	\N	t	อ้อม	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
cml5w8h240001ugxaadqh8irg	wk02	แป้ง	วันวิสา อยู่สุข	\N	0966975469	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$wEEroV5jcPKtEkiVzjUZxOKbncgy2go45mX8v80wqQlD5cYu9Pf0u	CASHIER	cml5by818000014m683rzadum	cml5byaaj000j14m6lxzgng16	-zcd007	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	10500.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 04:17:00.522	2026-02-04 23:04:03.752	\N	7852186514.0	\N	\N	\N	\N	\N	\N	\N	t	แป้ง	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
cml6ctvrh001luqrg60imh1k9	EMP98FCD	\N	สำเริง สีจันทร์สุก	\N	0844946524	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by818000014m683rzadum	cml5byaga000n14m6f7mxdl6d	-tvo3gw	\N	0.000000000000000000000000000000	0.000000000000000000000000000000	11300.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.805	2026-02-05 04:29:36.72	\N	7852186613.0	\N	\N	\N	\N	\N	\N	\N	t	หมู	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
cml6ctvja0013uqrgbdjr4l0e	EMP287F3	\N	ปราณี บรรจบสมัย	\N	0982959649	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byaor000t14m6ik3csf83	-xk7lgp	\N	43.375000000000000000000000000000	347.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:25.51	2026-02-05 06:51:33.365	\N	7852193874.0	\N	\N	\N	\N	\N	\N	\N	t	อาง	\N	cml5by908000114m6el6np1dp	\N	2026-02-04 03:41:17.179
cml6cv8sm000313l7yhueq5zy	EMP7928C	\N	แม่บ้านพงษ์	\N	\N	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by908000114m6el6np1dp	cml5byazl001314m6ash3c3u0	-9jy4gm	\N	32.000000000000000000000000000000	320.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:47:29.35	2026-02-05 23:58:23.818	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	แม่บ้านพงษ์	\N	\N	\N	2026-02-04 03:41:17.179
cml6ctuwf0001uqrgn7ktp9je	EMP576EC	\N	รัตนวิภาพร ชัยนาท	\N	0983840683	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK	EMPLOYEE	cml5by92t000214m6ta5q3o28	cml5byb8t001b14m61yx8ar7q	4uyosu	\N	33.000000000000000000000000000000	330.000000000000000000000000000000	0.000000000000000000000000000000	1.500000000000000000000000000000	t	ACTIVE	2026-02-03 08:46:24.685	2026-02-06 23:51:35.869	\N	7852186878.0	\N	\N	\N	\N	\N	\N	\N	t	นก	\N	cml5by818000014m683rzadum	\N	2026-02-04 03:41:17.179
\.


--
-- Name: Advance Advance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Advance"
    ADD CONSTRAINT "Advance_pkey" PRIMARY KEY (id);


--
-- Name: AnnouncementRead AnnouncementRead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementRead"
    ADD CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY (id);


--
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Authenticator Authenticator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Authenticator"
    ADD CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId", "credentialID");


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: DailyPayrollOverride DailyPayrollOverride_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyPayrollOverride"
    ADD CONSTRAINT "DailyPayrollOverride_pkey" PRIMARY KEY (id);


--
-- Name: DepartmentShift DepartmentShift_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DepartmentShift"
    ADD CONSTRAINT "DepartmentShift_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeAvailability EmployeeAvailability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeAvailability"
    ADD CONSTRAINT "EmployeeAvailability_pkey" PRIMARY KEY (id);


--
-- Name: HappinessLog HappinessLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HappinessLog"
    ADD CONSTRAINT "HappinessLog_pkey" PRIMARY KEY (id);


--
-- Name: LeaveBalance LeaveBalance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaveBalance"
    ADD CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY (id);


--
-- Name: Leave Leave_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Leave"
    ADD CONSTRAINT "Leave_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OneOnOneLog OneOnOneLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OneOnOneLog"
    ADD CONSTRAINT "OneOnOneLog_pkey" PRIMARY KEY (id);


--
-- Name: OvertimeRequest OvertimeRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY (id);


--
-- Name: PayrollPeriod PayrollPeriod_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollPeriod"
    ADD CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY (id);


--
-- Name: PayrollRecord PayrollRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRecord"
    ADD CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: ProfileEditRequest ProfileEditRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileEditRequest"
    ADD CONSTRAINT "ProfileEditRequest_pkey" PRIMARY KEY (id);


--
-- Name: PushSubscription PushSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_pkey" PRIMARY KEY (id);


--
-- Name: ReviewPeriod ReviewPeriod_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewPeriod"
    ADD CONSTRAINT "ReviewPeriod_pkey" PRIMARY KEY (id);


--
-- Name: ReviewSubmission ReviewSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewSubmission"
    ADD CONSTRAINT "ReviewSubmission_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: ShiftAssignment ShiftAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftAssignment"
    ADD CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY (id);


--
-- Name: ShiftPattern ShiftPattern_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftPattern"
    ADD CONSTRAINT "ShiftPattern_pkey" PRIMARY KEY (id);


--
-- Name: ShiftPool ShiftPool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftPool"
    ADD CONSTRAINT "ShiftPool_pkey" PRIMARY KEY (id);


--
-- Name: ShiftSwap ShiftSwap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftSwap"
    ADD CONSTRAINT "ShiftSwap_pkey" PRIMARY KEY (id);


--
-- Name: ShiftTemplate ShiftTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftTemplate"
    ADD CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Shift Shift_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_pkey" PRIMARY KEY (id);


--
-- Name: SpecialIncome SpecialIncome_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SpecialIncome"
    ADD CONSTRAINT "SpecialIncome_pkey" PRIMARY KEY (id);


--
-- Name: Station Station_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Station"
    ADD CONSTRAINT "Station_pkey" PRIMARY KEY (id);


--
-- Name: SystemConfig SystemConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemConfig"
    ADD CONSTRAINT "SystemConfig_pkey" PRIMARY KEY (id);


--
-- Name: TimeCorrection TimeCorrection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeCorrection"
    ADD CONSTRAINT "TimeCorrection_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Advance_month_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Advance_month_year_idx" ON public."Advance" USING btree (month, year);


--
-- Name: Advance_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Advance_status_idx" ON public."Advance" USING btree (status);


--
-- Name: Advance_userId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Advance_userId_date_idx" ON public."Advance" USING btree ("userId", date);


--
-- Name: AnnouncementRead_announcementId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementRead_announcementId_idx" ON public."AnnouncementRead" USING btree ("announcementId");


--
-- Name: AnnouncementRead_announcementId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AnnouncementRead_announcementId_userId_key" ON public."AnnouncementRead" USING btree ("announcementId", "userId");


--
-- Name: AnnouncementRead_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementRead_userId_idx" ON public."AnnouncementRead" USING btree ("userId");


--
-- Name: Announcement_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_createdAt_idx" ON public."Announcement" USING btree ("createdAt");


--
-- Name: Announcement_isPinned_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_isPinned_idx" ON public."Announcement" USING btree ("isPinned");


--
-- Name: Attendance_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Attendance_date_idx" ON public."Attendance" USING btree (date);


--
-- Name: Attendance_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Attendance_status_idx" ON public."Attendance" USING btree (status);


--
-- Name: Attendance_userId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Attendance_userId_date_key" ON public."Attendance" USING btree ("userId", date);


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: Authenticator_credentialID_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON public."Authenticator" USING btree ("credentialID");


--
-- Name: Comment_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_postId_idx" ON public."Comment" USING btree ("postId");


--
-- Name: DailyPayrollOverride_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyPayrollOverride_date_idx" ON public."DailyPayrollOverride" USING btree (date);


--
-- Name: DailyPayrollOverride_userId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DailyPayrollOverride_userId_date_key" ON public."DailyPayrollOverride" USING btree ("userId", date);


--
-- Name: DailyPayrollOverride_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyPayrollOverride_userId_idx" ON public."DailyPayrollOverride" USING btree ("userId");


--
-- Name: DepartmentShift_departmentId_shiftId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DepartmentShift_departmentId_shiftId_key" ON public."DepartmentShift" USING btree ("departmentId", "shiftId");


--
-- Name: Department_stationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Department_stationId_code_key" ON public."Department" USING btree ("stationId", code);


--
-- Name: Department_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Department_stationId_idx" ON public."Department" USING btree ("stationId");


--
-- Name: EmployeeAvailability_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeAvailability_date_idx" ON public."EmployeeAvailability" USING btree (date);


--
-- Name: EmployeeAvailability_userId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeAvailability_userId_date_key" ON public."EmployeeAvailability" USING btree ("userId", date);


--
-- Name: EmployeeAvailability_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeAvailability_userId_idx" ON public."EmployeeAvailability" USING btree ("userId");


--
-- Name: HappinessLog_userId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HappinessLog_userId_date_idx" ON public."HappinessLog" USING btree ("userId", date);


--
-- Name: LeaveBalance_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LeaveBalance_userId_idx" ON public."LeaveBalance" USING btree ("userId");


--
-- Name: LeaveBalance_userId_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LeaveBalance_userId_year_key" ON public."LeaveBalance" USING btree ("userId", year);


--
-- Name: Leave_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Leave_status_idx" ON public."Leave" USING btree (status);


--
-- Name: Leave_userId_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Leave_userId_startDate_idx" ON public."Leave" USING btree ("userId", "startDate");


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_userId_isRead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_isRead_idx" ON public."Notification" USING btree ("userId", "isRead");


--
-- Name: OneOnOneLog_supervisorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OneOnOneLog_supervisorId_idx" ON public."OneOnOneLog" USING btree ("supervisorId");


--
-- Name: OneOnOneLog_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OneOnOneLog_userId_idx" ON public."OneOnOneLog" USING btree ("userId");


--
-- Name: OvertimeRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OvertimeRequest_status_idx" ON public."OvertimeRequest" USING btree (status);


--
-- Name: OvertimeRequest_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OvertimeRequest_userId_idx" ON public."OvertimeRequest" USING btree ("userId");


--
-- Name: PayrollPeriod_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollPeriod_startDate_endDate_idx" ON public."PayrollPeriod" USING btree ("startDate", "endDate");


--
-- Name: PayrollRecord_periodId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PayrollRecord_periodId_userId_key" ON public."PayrollRecord" USING btree ("periodId", "userId");


--
-- Name: PayrollRecord_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PayrollRecord_userId_idx" ON public."PayrollRecord" USING btree ("userId");


--
-- Name: Permission_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_code_key" ON public."Permission" USING btree (code);


--
-- Name: Permission_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_group_idx" ON public."Permission" USING btree ("group");


--
-- Name: ProfileEditRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileEditRequest_status_idx" ON public."ProfileEditRequest" USING btree (status);


--
-- Name: ProfileEditRequest_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileEditRequest_userId_idx" ON public."ProfileEditRequest" USING btree ("userId");


--
-- Name: PushSubscription_endpoint_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON public."PushSubscription" USING btree (endpoint);


--
-- Name: PushSubscription_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PushSubscription_userId_idx" ON public."PushSubscription" USING btree ("userId");


--
-- Name: ReviewSubmission_employeeId_periodId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReviewSubmission_employeeId_periodId_key" ON public."ReviewSubmission" USING btree ("employeeId", "periodId");


--
-- Name: RolePermission_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RolePermission_role_idx" ON public."RolePermission" USING btree (role);


--
-- Name: RolePermission_role_permissionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON public."RolePermission" USING btree (role, "permissionId");


--
-- Name: ShiftAssignment_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftAssignment_date_idx" ON public."ShiftAssignment" USING btree (date);


--
-- Name: ShiftAssignment_shiftId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftAssignment_shiftId_idx" ON public."ShiftAssignment" USING btree ("shiftId");


--
-- Name: ShiftAssignment_userId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ShiftAssignment_userId_date_key" ON public."ShiftAssignment" USING btree ("userId", date);


--
-- Name: ShiftPattern_departmentId_month_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ShiftPattern_departmentId_month_year_key" ON public."ShiftPattern" USING btree ("departmentId", month, year);


--
-- Name: ShiftPool_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftPool_date_idx" ON public."ShiftPool" USING btree (date);


--
-- Name: ShiftPool_releasedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftPool_releasedBy_idx" ON public."ShiftPool" USING btree ("releasedBy");


--
-- Name: ShiftPool_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftPool_status_idx" ON public."ShiftPool" USING btree (status);


--
-- Name: ShiftSwap_requesterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftSwap_requesterId_idx" ON public."ShiftSwap" USING btree ("requesterId");


--
-- Name: ShiftSwap_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftSwap_status_idx" ON public."ShiftSwap" USING btree (status);


--
-- Name: ShiftSwap_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftSwap_targetId_idx" ON public."ShiftSwap" USING btree ("targetId");


--
-- Name: ShiftTemplate_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShiftTemplate_stationId_idx" ON public."ShiftTemplate" USING btree ("stationId");


--
-- Name: Shift_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Shift_code_idx" ON public."Shift" USING btree (code);


--
-- Name: Shift_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Shift_code_key" ON public."Shift" USING btree (code);


--
-- Name: Shift_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Shift_stationId_idx" ON public."Shift" USING btree ("stationId");


--
-- Name: SpecialIncome_stationId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SpecialIncome_stationId_date_idx" ON public."SpecialIncome" USING btree ("stationId", date);


--
-- Name: SpecialIncome_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SpecialIncome_status_idx" ON public."SpecialIncome" USING btree (status);


--
-- Name: SpecialIncome_userId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SpecialIncome_userId_date_idx" ON public."SpecialIncome" USING btree ("userId", date);


--
-- Name: Station_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Station_code_idx" ON public."Station" USING btree (code);


--
-- Name: Station_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Station_code_key" ON public."Station" USING btree (code);


--
-- Name: SystemConfig_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SystemConfig_key_key" ON public."SystemConfig" USING btree (key);


--
-- Name: TimeCorrection_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeCorrection_status_idx" ON public."TimeCorrection" USING btree (status);


--
-- Name: TimeCorrection_userId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeCorrection_userId_date_idx" ON public."TimeCorrection" USING btree ("userId", date);


--
-- Name: User_departmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_departmentId_idx" ON public."User" USING btree ("departmentId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_employeeId_key" ON public."User" USING btree ("employeeId");


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_stationId_idx" ON public."User" USING btree ("stationId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Advance Advance_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Advance"
    ADD CONSTRAINT "Advance_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AnnouncementRead AnnouncementRead_announcementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementRead"
    ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES public."Announcement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Announcement Announcement_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attendance Attendance_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Attendance Attendance_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Authenticator Authenticator_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Authenticator"
    ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comment Comment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comment Comment_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Announcement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyPayrollOverride DailyPayrollOverride_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyPayrollOverride"
    ADD CONSTRAINT "DailyPayrollOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DepartmentShift DepartmentShift_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DepartmentShift"
    ADD CONSTRAINT "DepartmentShift_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DepartmentShift DepartmentShift_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DepartmentShift"
    ADD CONSTRAINT "DepartmentShift_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Department Department_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HappinessLog HappinessLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HappinessLog"
    ADD CONSTRAINT "HappinessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Leave Leave_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Leave"
    ADD CONSTRAINT "Leave_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Leave Leave_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Leave"
    ADD CONSTRAINT "Leave_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OneOnOneLog OneOnOneLog_supervisorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OneOnOneLog"
    ADD CONSTRAINT "OneOnOneLog_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OneOnOneLog OneOnOneLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OneOnOneLog"
    ADD CONSTRAINT "OneOnOneLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OvertimeRequest OvertimeRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PayrollRecord PayrollRecord_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRecord"
    ADD CONSTRAINT "PayrollRecord_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public."PayrollPeriod"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PayrollRecord PayrollRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollRecord"
    ADD CONSTRAINT "PayrollRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileEditRequest ProfileEditRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileEditRequest"
    ADD CONSTRAINT "ProfileEditRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PushSubscription PushSubscription_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReviewSubmission ReviewSubmission_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewSubmission"
    ADD CONSTRAINT "ReviewSubmission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReviewSubmission ReviewSubmission_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewSubmission"
    ADD CONSTRAINT "ReviewSubmission_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public."ReviewPeriod"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShiftAssignment ShiftAssignment_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftAssignment"
    ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ShiftAssignment ShiftAssignment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftAssignment"
    ADD CONSTRAINT "ShiftAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShiftSwap ShiftSwap_requesterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftSwap"
    ADD CONSTRAINT "ShiftSwap_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ShiftSwap ShiftSwap_targetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftSwap"
    ADD CONSTRAINT "ShiftSwap_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Shift Shift_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SpecialIncome SpecialIncome_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SpecialIncome"
    ADD CONSTRAINT "SpecialIncome_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimeCorrection TimeCorrection_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeCorrection"
    ADD CONSTRAINT "TimeCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_registeredStationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_registeredStationId_fkey" FOREIGN KEY ("registeredStationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Lct4alQcNd0HgL7eMa0eG6LycUbK49ipsRd2ClJVmLie5ghuLeciCDvXa9WzXGn

