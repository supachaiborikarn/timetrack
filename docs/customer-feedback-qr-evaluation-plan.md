# Task: ระบบประเมินพนักงานและสถานีผ่าน QR

สถานะ: พร้อมส่งต่อให้ AI ทำงานต่อ

วันที่จัดทำ: 23 สิงหาคม 2569

โปรเจกต์เป้าหมาย: timetrack

ขอบเขตงานรอบนี้: ออกแบบงานและแผนพัฒนา

## 1. ผลลัพธ์ที่ต้องการ

ลูกค้าสแกน QR แล้วเริ่มประเมินได้ทันทีโดยไม่ต้องเข้าสู่ระบบ

พนักงานที่ให้บริการลูกค้ามี QR ประจำตัวคนละหนึ่งรหัส

แต่ละสถานีมี QR ประเมินสถานีแยกจาก QR ของพนักงาน

แบบประเมินปกติใช้เวลาประมาณ 1 นาที

คำตอบระบุได้ว่าปัญหาเกิดจากพนักงาน ขั้นตอน ระบบ หรือสภาพสถานี

ผู้จัดการเห็นแนวโน้ม คะแนน สาเหตุ และงานที่ต้องติดตาม

ข้อมูลลูกค้าเป็นหลักฐานประกอบรอบประเมินพนักงานเมื่อมีจำนวนคำตอบเพียงพอ

ระบบไม่ใช้ความคิดเห็นหนึ่งรายการลงโทษ ตัดโบนัส หรือปรับเงินเดือนอัตโนมัติ

## 2. ข้อมูลจากระบบเดิมที่ต้องรู้ก่อนเริ่ม

### 2.1 ระบบ Performance เดิม

ระบบมี ReviewPeriod และ ReviewSubmission ใน prisma/schema.prisma

ReviewSubmission รองรับ selfReview, managerReview และ rating

หน้า src/app/performance/page.tsx ใช้ให้พนักงานส่งแบบประเมินตนเอง

หน้า src/app/admin/performance/page.tsx ทำได้เพียงสร้างและดูรายการรอบประเมิน

ระบบยังไม่มีหน้าหรือ API สำหรับหัวหน้ากรอก managerReview และ rating

Dashboard พนักงานมี performanceScore อีกชุดที่คำนวณจากการสาย ออกก่อน และขาดงาน

ข้อมูลทั้งสองชุดยังไม่ได้รวมเป็นระบบคะแนนเดียวกัน

### 2.2 QR สถานีเดิม

Station.qrCode ใช้ลงเวลา เช็กเอาต์ จบพัก และย้ายสถานี

หน้า src/app/admin/qr-codes/page.tsx ใช้สร้างและพิมพ์ QR ลงเวลา

API src/app/api/admin/qr-codes/route.ts สร้างรหัสข้อความสำหรับตรวจการลงเวลา

ห้ามนำ Station.qrCode ไปใช้กับการประเมินลูกค้า

ห้ามเปลี่ยน QR ลงเวลาเดิมให้กลายเป็น URL ประเมิน

การประเมินต้องมีตาราง รหัส หน้า และสิทธิ์แยกทั้งหมด

### 2.3 ของเดิมที่นำมาใช้ต่อได้

src/lib/qr-code.ts มีฟังก์ชันสร้างและดาวน์โหลด QR แบบ SVG

หน้าใบสมัครงานสาธารณะมีตัวอย่างฟอร์ม mobile-first และ success state

src/lib/form-token.ts มีแนวทาง signed token และตรวจเวลาที่ใช้กรอก

src/lib/rate-limit.ts มี rate limit แบบ memory ซึ่งใช้เป็นด่านเบื้องต้นได้

src/lib/crypto-field.ts มี helper เข้ารหัสข้อมูลที่นำมาใช้กับ token และข้อมูลติดต่อได้

src/lib/permissions.ts มีระบบสิทธิ์ตาม role และ permission code

src/lib/date-utils.ts มีฟังก์ชันวันที่ตามเวลา Asia/Bangkok

src/app/globals.css มีสีหลักเหลือง การ์ด และ dark mode ของระบบ

src/components/ui มี Button, Card, Checkbox, Input, Select, Tabs และ Textarea

Recharts และ XLSX มีอยู่แล้วสำหรับกราฟและ export

ระบบมีภาษาไทย อังกฤษ และพม่าผ่าน language context

## 3. ข้อสรุปที่ล็อกไว้

### 3.1 QR

QR ประเมินเก็บรหัสสุ่มที่เดาไม่ได้และไม่ใส่ User.id, employeeId, Station.id หรือชื่อใน URL

URL ใน QR ใช้รูปแบบ https://โดเมนจริง/f#t=รหัสสุ่มเพื่อไม่ให้รหัสอยู่ใน access log ของ CDN หรือ proxy

ป้ายพิมพ์ https://โดเมนจริง/f พร้อมรหัสกรอกเอง 8 ตัวเป็นทางสำรองสำหรับคนที่สแกนไม่ได้

ระบบสร้าง URL จาก APP_BASE_URL ฝั่ง server

หน้าจัดการ QR ห้ามสร้าง URL จาก window.location.origin

Production ต้องปฏิเสธ APP_BASE_URL ที่เป็น localhost หรือ preview domain

พนักงานหนึ่งคนมี QR หลักที่ใช้งานได้หนึ่งรหัส

พนักงานย้ายสาขาแล้วใช้ QR เดิมได้

สถานีหนึ่งแห่งมี QR หลักหนึ่งรหัสใน MVP

สร้าง helper `isStationFeedbackEnabled` ซึ่งให้ผล true เมื่อ Station.isActive มี publicEmergencyPhone และมี primary STATION QR ที่ isActive

สร้าง helper `isEmployeeFeedbackStationEligible` ซึ่งให้ผล true เมื่อ Station.isActive เพื่อให้ QR พนักงานทำงานได้แม้สถานีนั้นยังไม่มี QR ประเมินสถานี

หน้าและ API ของ Station feedback ใช้ `isStationFeedbackEnabled` จาก helper กลางชุดเดียวกัน

การหาหรือเลือกสถานีใน Employee feedback และ Incident ใช้ `isEmployeeFeedbackStationEligible` จาก helper กลางชุดเดียวกัน

โครงสร้างข้อมูลต้องรองรับ QR ย่อยตามจุดติดตั้งในอนาคต เช่น จุดชำระเงิน ห้องน้ำ และหัวจ่าย

การหมุนรหัสทำให้ป้ายเก่าใช้ไม่ได้และต้องมีข้อความเตือนก่อนยืนยัน

ระบบไม่ลบ QR ที่เคยมีคำตอบและใช้การปิดใช้งานแทน

### 3.2 ข้อมูลที่แสดงต่อสาธารณะ

QR พนักงานแสดงชื่อเรียก ตำแหน่ง และสถานีเท่าที่จำเป็น

หน้า admin เสนอชื่อเล่นหรือชื่อจริงส่วนแรกเป็นค่า draft และห้ามเผยแพร่ทันที

พนักงานเลือกใช้ชื่อเล่น ชื่อจริงส่วนแรก หรือรหัสเรียกสาธารณะที่ HR กำหนดได้

ตำแหน่งสาธารณะเป็นข้อความแยกใน QR และใช้ “พนักงานบริการ” ได้เมื่อระบบเดิมไม่มีชื่อตำแหน่ง

HR ต้องบันทึกว่าพนักงานรับทราบ publicLabel และ publicPosition ก่อนเปิด QR

ระบบต้องปฏิเสธการ activate QR พนักงานที่ยังไม่มี public profile approval

หน้า public ห้ามแสดงนามสกุล รหัสพนักงาน เบอร์โทร อีเมล หรือข้อมูลค่าจ้าง

MVP ไม่แสดงรูปพนักงานเพราะ route รูปเดิมต้องมี session

ถ้าจะเปิดรูปภายหลังต้องมีรูปที่อนุญาตให้เผยแพร่สาธารณะแยกจากเอกสารพนักงาน

### 3.3 แบบประเมิน

ลูกค้าไม่ต้องสร้างบัญชีและไม่ต้องระบุชื่อ

คะแนนใช้ระดับ 1–5 ชุดเดียวกันทุกแบบประเมิน

คะแนนไม่มีค่าเริ่มต้น

คำถามคะแนนรวมอยู่ก่อนคำถามสาเหตุ

คำถามสาเหตุแยกปัญหาที่พนักงานควบคุมได้ออกจากปัญหาของระบบ

คะแนน 1–2 ต้องเลือกสาเหตุอย่างน้อยหนึ่งข้อหรือเลือกไม่สะดวกระบุ

คะแนน 3–5 ข้ามคำถามสาเหตุได้

ข้อความเพิ่มเติมและข้อมูลติดต่อเป็นตัวเลือก

แบบประเมินพนักงานและสถานีมี question key คนละชุด

question key ที่เผยแพร่แล้วห้ามเปลี่ยนความหมาย

เมื่อแก้คำถามต้องเพิ่ม survey version ใหม่และเก็บ version เดิมไว้

MVP ไม่มีหน้าสร้างแบบสอบถามแบบอิสระ

หน้า Questions ของผู้ดูแลแสดงคำถามและ version แบบอ่านอย่างเดียว

### 3.4 การใช้คะแนนกับ Performance

Customer Feedback เก็บในตารางใหม่และไม่เขียนลง ReviewSubmission โดยตรง

MVP แสดงผลลูกค้าเป็น evidence stream แยกจากคะแนน attendance และ manager review

รายคนต้องมีคำตอบที่ผ่านการตรวจอย่างน้อย 10 รายการในช่วงที่เลือกก่อนแสดงคะแนนสรุป

ถ้าคำตอบยังไม่ถึง 10 รายการให้แสดงจำนวนคำตอบและข้อความว่าข้อมูลยังไม่พอ

ห้ามจัดอันดับพนักงานที่คำตอบยังไม่ถึงเกณฑ์

ห้ามนำคะแนนเข้าค่าจ้าง โบนัส หรือการลงโทษใน MVP

การผูกน้ำหนัก 10–15 เปอร์เซ็นต์ทำได้หลังจบ pilot และมีเกณฑ์ป้องกันการปั่นคะแนน

ทุกหน้าคะแนนต้องแสดงจำนวนคำตอบ ช่วงเวลา และสัดส่วนคำตอบที่ถูกติดธง

## 4. ผู้ใช้งานและสิทธิ์

| ผู้ใช้ | งานที่ทำ |
|---|---|
| ลูกค้า | สแกน QR ให้คะแนน ส่งคำชม แจ้งปัญหา และขอให้ติดต่อกลับ |
| ADMIN | ดูทุกสถานี จัดการ QR ดูข้อมูลติดต่อ export และตั้งค่าระบบ |
| HR | ดูทุกสถานี จัดการ QR ดูข้อมูลติดต่อ และใช้ผลประกอบรอบประเมิน |
| MANAGER | ดูผลและจัดการเคสของสถานีที่ตนรับผิดชอบ |
| EMPLOYEE | ดูผลสรุปของตนเมื่อผ่านการกลั่นกรองและมีจำนวนคำตอบเพียงพอ |
| ผู้วิเคราะห์ข้อมูล | รับไฟล์ export ที่ตัดข้อมูลติดต่อออกจาก ADMIN หรือ HR |

MVP ไม่เพิ่ม Role ANALYST เพราะ auth ปัจจุบันไม่มี role นี้

เพิ่ม permission ต่อไปนี้ด้วย additive seed

| Permission | ความหมาย | ค่าเริ่มต้น |
|---|---|---|
| customer_feedback.view_dashboard | ดู Dashboard ที่เป็นข้อมูลรวม | ADMIN, HR, MANAGER |
| customer_feedback.view_response | ดูคำตอบและข้อความดิบ | ADMIN, HR, MANAGER |
| customer_feedback.view_incident | ดูรายละเอียดเหตุเร่งด่วน | ADMIN, HR, MANAGER |
| customer_feedback.self_view | ดูผลสรุปของตนเอง | EMPLOYEE |
| customer_feedback.review_request | ส่งและดูคำขอทบทวนของตนเอง | EMPLOYEE |
| customer_feedback.review_request_manage | ดูและปิดคำขอทบทวน | ADMIN, HR |
| customer_feedback.manage | สร้าง ปิด หมุน และพิมพ์ QR | ADMIN, HR |
| customer_feedback.case_manage | รับงาน มอบหมาย และปิดเคส | ADMIN, HR, MANAGER |
| customer_feedback.export | export ข้อมูลที่ไม่มีข้อมูลติดต่อ | ADMIN, HR |
| customer_feedback.view_contact | เปิดดูข้อมูลติดต่อกลับ | ADMIN, HR |
| customer_feedback.moderate | ติดธง ซ่อน หรือคืนคำตอบ | ADMIN, HR |

MANAGER ต้องถูกจำกัด stationId ฝั่ง API ทุก endpoint

MANAGER ที่ไม่มี stationId ต้องได้ 403 และห้าม fallback เป็นข้อมูลทุกสถานี

ทุก internal API ต้องใช้ session.user.id ค้น User.isActive, role และ stationId ปัจจุบันจากฐานข้อมูลก่อนตรวจ permission หรือสร้าง station scope

ห้ามใช้ role หรือ stationId ใน JWT เป็นค่าตัดสิน scope เพราะ session เดิมอาจยังถือค่าสถานีก่อนย้าย

การซ่อนเมนูฝั่งหน้าเว็บอย่างเดียวไม่ถือว่าเป็นการจำกัดสิทธิ์

การดูข้อมูลติดต่อทุกครั้งต้องบันทึก AuditLog

## 5. เส้นทาง QR พนักงาน

### E0: เปิด QR และยืนยันเป้าหมาย

ระบบตรวจว่า token มีอยู่ เปิดใช้งาน และผูกกับพนักงานที่ active

ระบบหาสถานี active จาก StationTransfer ล่าสุดที่ผูกกับ Attendance ของวันหรือกะปัจจุบันและมี transferTime ไม่เกินเวลาสแกนก่อน

ห้ามนำ StationTransfer เก่าจาก attendance ก่อนหน้ามาใช้เป็นสถานีปัจจุบัน

ถ้าไม่มีรายการย้ายสถานีให้ใช้ checkInStation ของ Attendance ล่าสุดในวันนั้นเมื่อสถานียัง active

ถ้าไม่มีข้อมูลลงเวลาให้ใช้ User.stationId เป็นค่าเริ่มต้นเมื่อสถานียัง active

ถ้าหาสถานีไม่ได้ หน้า E0 ต้องให้เลือกสถานี active ก่อนเริ่มตอบและห้ามไป E1 จนกว่าจะเลือกสำเร็จ

ถ้าไม่มีสถานี active ให้แสดงว่ายังรับแบบประเมินปกติไม่ได้ พร้อมคงลิงก์แจ้งเหตุเร่งด่วนไว้

หน้าแสดงชื่อเรียก ตำแหน่ง และสถานี

ข้อความเปิดใช้ว่า “ประเมินการให้บริการ ใช้เวลาประมาณ 1 นาที และไม่ต้องระบุชื่อ”

คำถามบังคับใช้ว่า “วันนี้พนักงานคนนี้เป็นผู้ให้บริการคุณใช่ไหม”

ตัวเลือกมี “ใช่”, “ไม่ใช่” และ “ไม่แน่ใจ”

ถ้าตอบ “ไม่ใช่” หรือ “ไม่แน่ใจ” ระบบไม่สร้างคะแนนให้พนักงาน

หน้าถัดไปเสนอปุ่ม “สแกน QR ใหม่” และคำแนะนำให้สแกน QR ประเมินสถานีที่จุดบริการ

ห้ามเปิด station form ต่อจาก QR พนักงานในกรณีนี้

E0 มีลิงก์ “สถานีไม่ถูกต้อง” ใต้ชื่อสถานีและไม่เพิ่มขั้นตอนใหม่

เมื่อเปิดลิงก์ให้ค้นหาและเลือกจากสถานี active ตาม `isEmployeeFeedbackStationEligible`

เมื่อแก้แล้วต้องยืนยันชื่อสถานีอีกครั้งและบันทึก stationContextSource เป็น CUSTOMER_SELECTED

### E1: ให้คะแนนรวม

คำถามบังคับใช้ว่า “โดยรวม คุณพอใจกับการให้บริการครั้งนี้เพียงใด”

| ค่า | ข้อความ |
|---|---|
| 1 | ไม่พอใจมาก |
| 2 | ไม่พอใจ |
| 3 | ปานกลาง |
| 4 | พอใจ |
| 5 | พอใจมาก |

ระบบเก็บค่าใน overallRating

ระบบไม่เปลี่ยนหน้าทันทีหลังเลือกคะแนน

ลูกค้าต้องกดปุ่ม “ถัดไป” เพื่อป้องกันการแตะผิด

### E2: เลือกสาเหตุและเพิ่มรายละเอียด

E2 และ E3 อยู่หน้าเดียวกันและนับเป็นขั้นตอนที่ 3 ของแบบประเมินพนักงาน

คะแนน 4–5 ใช้คำถามว่า “เรื่องใดทำให้คุณพอใจ”

คะแนน 3 ใช้คำถามว่า “เรื่องใดมีผลต่อคะแนนนี้”

คะแนน 1–2 ใช้คำถามว่า “เรื่องใดควรปรับก่อน”

เลือกได้ไม่เกิน 2 ข้อ

| Question key | ข้อความ | เจ้าของปัญหา |
|---|---|---|
| employee_courtesy | การพูดจาและความสุภาพ | พนักงาน |
| employee_clarity | ความชัดเจนของข้อมูล | พนักงาน |
| employee_accuracy | ความถูกต้องของบริการ | พนักงาน |
| employee_helpfulness | การใส่ใจและช่วยแก้ปัญหา | พนักงาน |
| employee_safety | การปฏิบัติตามขั้นตอนความปลอดภัยขณะให้บริการ | พนักงาน |
| employee_fairness | ความเท่าเทียมในการให้บริการ | พนักงาน |
| system_wait | เวลารอหรือจำนวนพนักงาน | ระบบ |
| system_process | ขั้นตอนหรือระบบชำระเงิน | ระบบ |
| system_availability | สินค้าหรืออุปกรณ์ไม่พร้อม | ระบบ |
| other | อื่น ๆ | ยังไม่ทราบ |
| unspecified | ไม่สะดวกระบุ | ยังไม่ทราบ |

ตัวเลือกที่ไม่มีลำดับให้หมุนลำดับตาม visitId

ระบบตรึง other และ unspecified ไว้ท้ายรายการ

unspecified เป็นตัวเลือกเดี่ยวและเมื่อเลือกแล้วระบบต้องยกเลิกตัวเลือกอื่นทันที

ระบบเก็บลำดับตัวเลือกที่ลูกค้าเห็นเพื่อวิเคราะห์ผลจากตำแหน่งคำตอบ

### E3: ข้อความและการติดตาม

คะแนน 4–5 ใช้คำถามว่า “มีอะไรที่อยากชมเพิ่มเติมไหม”

คะแนน 3 ใช้คำถามว่า “มีอะไรที่จะทำให้บริการครั้งหน้าดีขึ้นไหม”

คะแนน 1–2 ใช้คำถามว่า “ช่วยเล่าว่าเกิดอะไรขึ้น เพื่อให้เราตรวจสอบได้ตรงจุด”

ช่องข้อความไม่บังคับและจำกัด 500 ตัวอักษร

ข้อความช่วยใช้ว่า “กรุณาระบุเหตุการณ์หรือขั้นตอนที่พบ และหลีกเลี่ยงข้อมูลส่วนตัวที่ไม่จำเป็น”

ทุกคะแนนแสดงตัวเลือก “ขอให้ติดต่อกลับ” ไว้ใต้ปุ่ม “เพิ่มรายละเอียด”

คะแนน 1–2 แสดงข้อความก่อนส่งว่า “คำตอบนี้จะสร้างเรื่องให้ทีมตรวจสอบ”

ลูกค้าเปิด “แจ้งเหตุเร่งด่วนหรือพฤติกรรมไม่เหมาะสม” ได้จากทุกหน้า

ถ้าขอให้ติดต่อกลับให้เลือกโทรศัพท์หรืออีเมลหนึ่งช่องทาง

ข้อมูลติดต่อเก็บแยกจากคำตอบทั่วไป

### E4: หน้าขอบคุณ

ข้อความหลักใช้ว่า “รับความคิดเห็นแล้ว ขอบคุณที่ช่วยให้เราปรับบริการ”

หลังประเมินพนักงานให้แนะนำว่า “หากต้องการประเมินสถานี โปรดสแกน QR ประเมินสถานีที่จุดบริการ”

ระบบห้ามสร้าง station response หรือ station visit จาก QR พนักงาน

หน้าขอบคุณของคะแนน 1–2 แสดงเลขอ้างอิงเคสและเวลารับทราบตาม SLA

## 6. เส้นทาง QR สถานี

### S0: เปิด QR และยืนยันสถานี

ระบบตรวจ token และสถานะของสถานี

หน้าแสดงชื่อสถานีและจุดติดตั้ง QR

คำถามบังคับใช้ว่า “วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม”

ตัวเลือกมี “ใช่”, “ไม่ใช่” และ “ไม่แน่ใจ”

ถ้าตอบ “ไม่ใช่” หรือ “ไม่แน่ใจ” ระบบไม่สร้างคะแนนให้สถานี

### S1: เลือกส่วนที่ใช้บริการ

คำถามใช้ว่า “วันนี้คุณใช้บริการส่วนใด”

เลือกได้มากกว่าหนึ่งข้อ

| Service area key | ข้อความ |
|---|---|
| fuel_service | จุดเติมน้ำมันหรือดูแลรถ |
| payment_shop | จุดชำระเงินหรือร้านค้า |
| food_beverage | อาหารหรือเครื่องดื่ม |
| information_help | จุดข้อมูลหรือขอความช่วยเหลือ |
| restroom | ห้องน้ำ |
| parking_access | ทางเข้า ทางออก หรือที่จอดรถ |
| other | อื่น ๆ |
| unsure | ไม่แน่ใจ |

QR ที่ติดจุดย่อยสามารถกำหนด serviceArea ไว้ล่วงหน้า

ถ้า serviceArea มาจาก QR จุดย่อย หน้าแสดงค่าให้ลูกค้ายืนยันและแก้ได้

ซ่อนขั้นตอน S1 เมื่อสถานีไม่มีหลายส่วนบริการและใช้ serviceArea จาก QR หรือค่าหลักของสถานี

unsure เป็นตัวเลือกเดี่ยวและเมื่อเลือกแล้วระบบต้องยกเลิก service area อื่นทันที

### S2: ให้คะแนนรวม

คำถามบังคับใช้ว่า “โดยรวม คุณพอใจกับการใช้บริการที่สถานีนี้วันนี้เพียงใด”

ใช้คะแนน 1–5 และคำอธิบายชุดเดียวกับแบบประเมินพนักงาน

### S3: เลือกสาเหตุและเพิ่มรายละเอียด

S3 และ S4 อยู่หน้าเดียวกันและเป็นขั้นตอนสุดท้ายก่อนส่ง

คะแนน 4–5 ใช้คำถามว่า “เรื่องใดทำให้คุณพอใจ”

คะแนน 3 ใช้คำถามว่า “เรื่องใดมีผลต่อคะแนนนี้”

คะแนน 1–2 ใช้คำถามว่า “เรื่องใดควรปรับก่อน”

เลือกได้ไม่เกิน 3 ข้อ

| Question key | ข้อความ |
|---|---|
| station_cleanliness | ความสะอาด |
| station_orderliness | ความเป็นระเบียบ |
| station_wait | เวลารอ |
| station_signage | ป้ายและข้อมูล |
| station_facilities | ความพร้อมของอุปกรณ์หรือจุดบริการ |
| station_access | ความสะดวกในการเข้าใช้ |
| station_safety | ความปลอดภัย |
| station_staff_service | การบริการของพนักงานโดยรวม |
| station_process | ขั้นตอนการให้บริการ |
| station_availability | สินค้าหรือบริการพร้อมใช้งาน |
| other | อื่น ๆ |
| unspecified | ไม่สะดวกระบุ |

unspecified เป็นตัวเลือกเดี่ยวและเมื่อเลือกแล้วระบบต้องยกเลิกตัวเลือกอื่นทันที

### S4: ข้อความและหน้าขอบคุณ

คำถามไม่บังคับใช้ว่า “ถ้าสถานีปรับหรือเพิ่มได้ 1 อย่าง คุณอยากให้ทำอะไร”

จำกัดข้อความ 300 ตัวอักษร

ทุกคะแนนแสดงตัวเลือก “ขอให้ติดต่อกลับ” ไว้ใต้ปุ่ม “เพิ่มรายละเอียด”

คะแนน 1–2 แสดงข้อความก่อนส่งว่า “คำตอบนี้จะสร้างเรื่องให้ทีมตรวจสอบ”

หน้าขอบคุณใช้ข้อความ “รับความคิดเห็นเกี่ยวกับสถานีแล้ว ขอบคุณที่ช่วยให้เราปรับบริการ”

หน้าขอบคุณแสดงเลขอ้างอิงเคสเมื่อคะแนน 1–2 และแสดงตัวเลือกขอให้ติดต่อกลับตามข้อมูลที่ส่ง

Station QR ไม่ให้เลือกรายชื่อพนักงานเพื่อป้องกันการเลือกผิดคน

ถ้าลูกค้าอยากประเมินพนักงาน หน้าขอบคุณแนะนำให้สแกน QR บนป้ายชื่อพนักงาน

## 7. เส้นทางแจ้งเหตุเร่งด่วน

ลิงก์ “แจ้งเหตุเร่งด่วนหรือพฤติกรรมไม่เหมาะสม” อยู่บนทุกหน้าของแบบประเมิน

ลูกค้าเข้าเส้นทางนี้ได้โดยไม่ต้องให้คะแนนก่อน

เมื่อกดลิงก์ให้แสดงหน้าชี้แจงสั้นพร้อมปุ่ม “แจ้งเหตุต่อ” และ “กลับไปทำแบบประเมิน” โดยรักษาคำตอบร่างเดิมไว้

เมื่อกด “แจ้งเหตุต่อ” ระบบเรียก incident start endpoint เพื่อสร้าง INCIDENT Visit และ signed token สำหรับ incident-v1

ถ้ามี STANDARD Visit อยู่ให้สร้าง child Visit และคัดลอกเฉพาะ QR สถานี พนักงาน ภาษา และเวลาเป็นค่าเริ่มต้น

ห้ามใช้ signed token ของ employee-v1 หรือ station-v1 ส่ง incident-v1 โดยตรง

หนึ่ง STANDARD Visit มี child INCIDENT Visit ได้หนึ่งรายการและการเรียกซ้ำต้องคืน child เดิม

การสร้าง child INCIDENT Visit ยังไม่เปลี่ยน disposition ของ parent และลูกค้ากลับไปทำแบบประเมินเดิมต่อได้ตราบที่ parent ยังไม่หมดอายุ

ถ้ากดแจ้งเหตุก่อน resolve QR ให้สร้าง INCIDENT Visit ที่ targetType เป็น UNKNOWN แล้วให้ลูกค้าเลือกสถานีภายหลังได้

หนึ่ง Visit ส่งได้หนึ่ง Response เท่านั้นและลูกค้าที่ส่งแบบปกติแล้วสามารถสร้าง child incident แยกได้

### U1: ประเภทเหตุ

คำถามบังคับใช้ว่า “เรื่องนี้เกี่ยวกับอะไร”

| Incident key | ข้อความ |
|---|---|
| safety_accident | ความปลอดภัยหรืออุบัติเหตุ |
| violence_threat | การข่มขู่หรือใช้ความรุนแรง |
| harassment_discrimination | การคุกคามหรือเลือกปฏิบัติ |
| fraud_wrong_charge | การทุจริตหรือเรียกเก็บเงินผิด |
| privacy | ข้อมูลส่วนบุคคลหรือความเป็นส่วนตัว |
| hazardous_area | อุปกรณ์หรือพื้นที่ที่เป็นอันตราย |
| other | อื่น ๆ |

### U2: อันตรายปัจจุบัน

คำถามใช้ว่า “ตอนนี้มีใครอยู่ในอันตรายหรือไม่”

ตัวเลือกมี “มี”, “ไม่มี” และ “ไม่แน่ใจ”

ถ้าตอบ “มี” ให้แสดงข้อความ “ออกจากพื้นที่เสี่ยงและติดต่อผู้ดูแลหรือหมายเลขฉุกเฉินทันที”

ทุกสถานีที่เปิด Station feedback ต้องตั้ง publicEmergencyPhone และหน้าเหตุเร่งด่วนต้องแสดงปุ่มโทร

เมื่อตอบว่ามีอันตรายให้แสดงปุ่ม “เหตุด่วนเหตุร้าย 191” และ “แพทย์ฉุกเฉิน 1669” เป็นทางเลือกส่วนกลาง

ข้อความกำกับใช้ว่า “หากมีอันตรายทันที ให้โทรขอความช่วยเหลือก่อนส่งแบบฟอร์ม”

ถ้า INCIDENT เริ่มแบบ UNKNOWN ให้แสดง 191 และ 1669 ก่อนและเพิ่มปุ่มผู้ดูแลสถานีเมื่อผู้ใช้เลือกสถานีแล้ว

ถ้า Employee feedback อยู่ในสถานีที่ไม่มี publicEmergencyPhone ให้แสดง 191 และ 1669 โดยไม่สร้างหมายเลขสถานีขึ้นเอง

ระบบเก็บร่างไว้ระหว่างการโทร

### U3: รายละเอียดและข้อมูลติดต่อ

คำถามใช้ว่า “เกิดอะไรขึ้น”

ลูกค้ากรอกรายละเอียดหรือเลือก “ไม่สะดวกให้รายละเอียด”

ระบบใช้เวลา สถานี และพนักงานจาก QR เป็นค่าเริ่มต้น

ลูกค้าแก้สถานีและเวลาได้

MVP ไม่รองรับไฟล์แนบเพื่อลดความเสี่ยงเรื่องรูปบุคคลและเอกสาร

ขั้นตอนสุดท้ายให้เลือก “ไม่ให้ข้อมูลติดต่อ” หรือ “ให้ติดต่อกลับ”

ระบบห้ามใช้ข้อความรับรองว่าไม่ระบุตัวตนแบบสมบูรณ์

### U4: เลขอ้างอิง

ระบบสร้างเลขอ้างอิงที่อ่านและแจ้งต่อเจ้าหน้าที่ได้

หน้าสำเร็จแสดงเลขอ้างอิงและเวลาตอบกลับตาม SLA ที่ตั้งไว้จริง

รายละเอียดเหตุเร่งด่วนแสดงเฉพาะผู้มี permission ที่กำหนด

ระบบไม่แสดงรายละเอียดโดยตรงแก่พนักงานที่ถูกร้องเรียน

## 8. กติกาสร้างเคสและแจ้งเตือน

คำตอบทั่วไปที่ได้คะแนน 1–2 สร้างเคสระดับ HIGH

คำตอบคะแนน 1–2 ที่ขอให้ติดต่อกลับใช้เคส HIGH เดิมของคำตอบนั้น

คำตอบคะแนน 3–5 ที่ขอให้ติดต่อกลับสร้างเคสระดับ NORMAL

incident key กลุ่ม safety_accident, violence_threat, harassment_discrimination, fraud_wrong_charge และ hazardous_area สร้างเคสระดับ URGENT

incident key privacy และ other สร้างเคสระดับ HIGH

dangerStatus เป็น YES ต้องยกระดับเคสเป็น URGENT ทุก incident key

คะแนน 3 พร้อมสาเหตุด้านความปลอดภัยสร้างเคสระดับ HIGH

คะแนน 3 ปกติไม่สร้างเคสและอยู่ในรายงานแนวโน้ม

ผู้ดูแลสร้างเคสจากคำตอบใดก็ได้ด้วยตนเอง

| Severity | SLA เริ่มต้น | การแจ้งเตือน |
|---|---|---|
| URGENT | รับทราบภายใน 2 ชั่วโมง | Notification และช่องทางฉุกเฉินที่ตั้งค่า |
| HIGH | รับทราบภายใน 24 ชั่วโมง | Notification ของ ADMIN, HR และผู้จัดการสถานี |
| NORMAL | รับทราบภายใน 72 ชั่วโมง | อยู่ในคิวงาน |

MVP คำนวณ dueAt เป็น elapsed hours จาก createdAt และแสดงเวลา Asia/Bangkok

MVP สร้าง Case, CustomerFeedbackAlertLog และ Notification ภายในฐานข้อมูล transaction เดียวกับ Response

ห้ามส่ง URGENT notification แบบ fire-and-forget หลัง transaction

ถ้าหาผู้จัดการสถานีไม่ได้ให้ส่ง Notification ไป ADMIN และ HR เป็น fallback

เพิ่ม Notification.eventKey แบบ nullable และเพิ่ม unique index ที่ userId, type กับ eventKey โดยค่า feedback ใช้ `feedback-case:{caseId}:{eventType}` เพื่อให้ retry ไม่ส่งซ้ำ

Notification เดิมที่ eventKey เป็น null ทำงานต่อได้ตามเดิม

ถ้าเพิ่มอีเมล Discord หรือช่องทางภายนอกภายหลังต้องเพิ่ม outbox ที่เขียนใน transaction และ retry จน SENT หรือ FAILED

สถานะเคสมี OPEN, IN_PROGRESS, RESOLVED และ DISMISSED

การปิดเคสต้องมี resolution note

การยกเลิกเคสต้องมี dismissed reason

การเปลี่ยนผู้รับผิดชอบ สถานะ ระดับ และรายละเอียดการปิดต้องบันทึก AuditLog

## 9. หน้าจอลูกค้า

### 9.1 หน้าตา

หน้า public ใช้สีเหลือง ขาว และสีข้อความจาก design token เดิม

พื้นหลังเรียบและเน้นคำถามทีละเรื่อง

ด้านบนมีโลโก้ ชื่อสถานี ปุ่มภาษา และลิงก์แจ้งเหตุเร่งด่วน

การ์ดยืนยันเป้าหมายแสดงชื่อเรียก ตำแหน่ง และสถานี

หลังยืนยันแล้วให้ย่อการ์ดเป้าหมายเพื่อลดผลของข้อมูลส่วนตัวต่อคะแนน

แบบประเมินพนักงานแสดง 3 ขั้นตอนคือยืนยันเป้าหมาย ให้คะแนน และระบุสาเหตุพร้อมรายละเอียด

แบบประเมินสถานีแสดง 4 ขั้นตอนเมื่อมีหน้าเลือกส่วนบริการและแสดง 3 ขั้นตอนเมื่อซ่อนหน้านี้

หน้ารอ resolve ก่อนแสดงคำถามและหน้าขอบคุณไม่ถูกนับในตัวบอกขั้นตอน

หน้ายืนยันเป้าหมายถูกนับเป็นขั้นตอนที่ 1

คะแนน 1–5 ใช้ native radio หรือ Radix RadioGroup ที่มี label ครบ

ตัวเลือกสาเหตุใช้ปุ่ม checkbox แบบ pill และแสดงจำนวนที่เลือก

สถานะที่เลือกใช้ข้อความ เครื่องหมาย และสีร่วมกัน

ปุ่มหลักอยู่ด้านล่างและมีหนึ่งปุ่มต่อหน้า

ระบบไม่เปลี่ยนหน้าอัตโนมัติหลังแตะตัวเลือก

ช่องข้อความเริ่มจากปุ่ม “เพิ่มรายละเอียด” แล้วจึงขยาย

หน้า success ใช้ CheckCircle จาก Lucide และข้อความสั้น

ห้ามใช้ emoji เป็นข้อมูลหลัก

### 9.2 Mobile และ accessibility

รองรับความกว้าง 320, 375, 390, 430 และ 768 พิกเซล

หน้าจอไม่มีการเลื่อนด้านข้าง

พื้นที่แตะปุ่มอย่างน้อย 44 คูณ 44 CSS pixels

ตัวอักษรไทยพื้นฐานอย่างน้อย 16 พิกเซล

ข้อความปกติมี contrast อย่างน้อย 4.5 ต่อ 1

ทุกคำถามมี label ที่โปรแกรมอ่านหน้าจออ่านได้

รองรับ keyboard และ focus ring

เมื่อเปลี่ยนขั้นให้ย้าย focus ไปหัวข้อคำถามใหม่

ข้อความผิดพลาดบอกปัญหาและวิธีแก้

ระบบเก็บคำตอบเดิมเมื่อส่งไม่สำเร็จ

หน้า public ต้องยอมให้ผู้ใช้ขยายหน้าจอ

route public ต้อง override ค่า viewport เดิมที่ปิด user zoom หรือแก้ root viewport ให้รองรับ zoom

รองรับ prefers-reduced-motion

ต้องทดสอบการขยายตัวอักษร 200 เปอร์เซ็นต์

### 9.3 ภาษา

MVP รองรับภาษาไทยและอังกฤษ

ระบบเก็บ language ของคำตอบ

question key และคะแนนเหมือนกันทุกภาษา

ภาษาอังกฤษต้องผ่านการอ่านทวนก่อนเปิดทุกสถานี

ภาษาเมียนมาสามารถเพิ่มเป็น survey version เดิมโดยไม่เปลี่ยน question key

### 9.4 สถานะผิดพลาด

resolve ของ QR ที่ไม่ถูกต้อง ถูกปิด หรือเป้าหมายไม่ active ใช้ข้อความกลางเดียวกันว่า “ไม่พบแบบประเมินนี้ โปรดสแกน QR ที่จุดบริการอีกครั้ง”

ถ้าเป้าหมายถูกปิดหลัง resolve ให้แจ้งว่าแบบประเมินหมดอายุและเสนอเริ่มใหม่โดยไม่ระบุสาเหตุภายใน

สถานีที่ถูกปิดหลัง resolve ไม่รับคะแนนและคงทางเข้าแจ้งเหตุเร่งด่วนไว้

อินเทอร์เน็ตขาดใช้ข้อความ “ยังส่งความคิดเห็นไม่ได้ คำตอบของคุณยังอยู่ในหน้านี้”

การส่งล้มเหลวมีปุ่ม “ลองส่งอีกครั้ง”

sessionStorage เก็บ signed visit token, clientNonce, ภาษา, ขั้นปัจจุบัน, คะแนน, reason key, service area และ target confirmation แล้วล้างหลังส่งสำเร็จ

sessionStorage และ localStorage ห้ามเก็บ comment ชื่อ เบอร์โทร หรืออีเมล

comment และข้อมูลติดต่ออยู่ในหน่วยความจำของหน้าปัจจุบันเพื่อ retry และหายเมื่อ reload หรือปิดแท็บ

อุปกรณ์ส่งซ้ำใช้ข้อความ “เราได้รับความคิดเห็นนี้แล้ว”

ระบบไม่บอกลูกค้าว่าคำตอบถูกติดธงความเสี่ยง

## 10. หน้าจอผู้ดูแล

เพิ่มเมนู “เสียงลูกค้า” ใกล้ Performance ใน admin sidebar

หน้าหลักใช้ route /admin/customer-feedback

แบ่งเป็น 5 แท็บ

### 10.1 Overview

ตัวกรองมีช่วงเวลา สถานี ประเภทเป้าหมาย ส่วนบริการ และสถานะความน่าเชื่อถือ

การ์ดสรุปมีจำนวนคำตอบที่ใช้ได้ คะแนนเฉลี่ย สัดส่วนคะแนน 4–5 สัดส่วนคะแนน 1–2 และจำนวนเคสค้าง

กราฟแนวโน้มแสดงคะแนนและจำนวนคำตอบในแกนเวลาที่อ่านได้

กราฟสาเหตุแยกพนักงาน ระบบ และสถานี

ตารางสถานีแสดงคะแนน จำนวนคำตอบ ปัญหาหลัก และเทียบช่วงก่อนหน้า

ตารางพนักงานแสดงเฉพาะคนที่ถึง minimum sample

ทุกค่าเฉลี่ยแสดง sample size

### 10.2 Responses

รายการคำตอบแสดงเวลา สถานี เป้าหมาย คะแนน สาเหตุ ข้อความ และสถานะ

ข้อมูลติดต่อไม่อยู่ใน response list ปกติ

ผู้มีสิทธิ์เปิดข้อมูลติดต่อจาก action แยกและระบบบันทึก AuditLog

ผู้กลั่นกรองติดธง SUSPECTED, ยืนยัน VALID หรือซ่อน HIDDEN ได้

การเปลี่ยนสถานะต้องมีเหตุผลเมื่อซ่อนคำตอบ

### 10.3 Cases

แสดงคิว OPEN และ IN_PROGRESS ก่อน

กรองตาม severity, SLA, station และ assignee ได้

แสดงตัวนับเวลาถึง dueAt

เคส URGENT มีรูปแบบที่เห็นชัดโดยไม่ใช้สีอย่างเดียว

ผู้จัดการเห็นเฉพาะเคสของสถานีตน

### 10.4 QR Codes

มีส่วนพนักงานและสถานีแยกกัน

ค้นหาพนักงานตามชื่อ สาขา แผนก และสถานะ QR ได้

สร้าง QR รายคนและแบบกลุ่มได้

ดาวน์โหลด SVG, PNG และ PDF พร้อมพิมพ์ได้

พิมพ์ QR พนักงานเป็นขนาดป้ายชื่อ

พิมพ์ QR สถานีเป็น A5 และ A4

ป้ายทุกแบบแสดงข้อความว่า QR พาไปทำอะไรและมี URL /f พร้อมรหัสกรอกเองใต้ QR

การหมุนรหัสมี confirmation และระบุว่าป้ายเก่าจะใช้ไม่ได้

หน้าแสดงวันที่พิมพ์ล่าสุดและ suffix ของ token เท่านั้น

client เรียก MARK_PRINTED หลังสร้างไฟล์ SVG, PNG หรือ PDF สำเร็จและ server เป็นผู้ตั้ง lastPrintedAt กับ lastPrintedById

ระบบห้ามสร้างไฟล์พิมพ์ EMPLOYEE QR ก่อนมี public profile approval

หน้าแสดง lastResolvedAt เพื่อรู้ว่า QR ยังสแกนได้จริง

หน้าเตือน QR ที่สร้างแล้วไม่มีการสแกนภายใน 7 วัน

Overview แสดง invalid resolve และ inactive resolve เป็นยอดรวมตามวันเพราะ request ที่หารหัสไม่พบผูกกลับไปยัง QR รายแผ่นไม่ได้

ห้ามแสดง token เต็มใน log หรือ table ที่ไม่จำเป็น

### 10.5 Questions

แสดง survey version ที่ใช้อยู่ของพนักงานและสถานี

แสดง question key, ข้อความทุกภาษา, required rule และ branching rule

MVP ไม่มีปุ่มแก้ข้อความใน production

การแก้คำถามทำใน source code พร้อมเพิ่ม version และ test

## 11. แบบป้าย QR

QR ใช้สีเข้มบนพื้นขาวและมีพื้นที่ว่างรอบรหัส

ห้ามใส่โลโก้ทับช่อง QR

QR พนักงานมีชื่อเรียก ตำแหน่ง และข้อความ “สแกนเพื่อประเมินการบริการ”

QR สถานีมีชื่อสถานี จุดติดตั้ง และข้อความ “ช่วยบอกเราประมาณ 1 นาที เพื่อปรับบริการที่สถานีนี้”

ทุกป้ายมี URL /f และรหัสกรอกเอง 8 ตัวสำหรับคนที่สแกนไม่ได้

QR พนักงานเริ่มทดสอบที่ขนาด 30 มิลลิเมตรขึ้นไป

QR สถานีเริ่มทดสอบที่ขนาด 50 มิลลิเมตรขึ้นไป

ขนาดจริงต้องยืนยันด้วยการสแกนจากป้ายที่พิมพ์จริง

ทดสอบภายใต้แสงสะท้อน แสงน้อย กล้อง Android รุ่นเก่า และ iPhone

ป้ายสถานีควรติดตรงจุดที่ลูกค้าหยุดอย่างปลอดภัย

ห้ามวางป้ายในตำแหน่งที่ต้องสแกนขณะขับรถ

## 12. โครงสร้างข้อมูลที่เสนอ

### 12.1 Enum

| Enum | ค่า |
|---|---|
| FeedbackTargetType | EMPLOYEE, STATION, UNKNOWN |
| FeedbackResponseKind | STANDARD, INCIDENT |
| FeedbackVisitKind | STANDARD, INCIDENT |
| FeedbackVisitDisposition | OPEN, SUBMITTED, TARGET_REJECTED, SWITCHED_TO_INCIDENT, ABANDONED, BOT_BLOCKED, EXPIRED |
| FeedbackQrPlacement | EMPLOYEE_BADGE, STATION_MAIN, CASHIER, PUMP, RESTROOM, SHOP, OTHER |
| FeedbackValidity | VALID, SUSPECTED, HIDDEN, TEST |
| FeedbackCaseStatus | OPEN, IN_PROGRESS, RESOLVED, DISMISSED |
| FeedbackCaseSeverity | NORMAL, HIGH, URGENT |
| FeedbackContactChannel | PHONE, EMAIL |
| FeedbackDangerStatus | YES, NO, UNSURE |
| FeedbackAnswerState | ANSWERED, SKIPPED, NOT_SHOWN |
| FeedbackReviewRequestStatus | OPEN, IN_REVIEW, RESOLVED, DISMISSED |

เพิ่ม publicEmergencyPhone แบบ nullable ใน Station สำหรับหมายเลขที่เปิดเผยต่อสาธารณะ

ห้ามนำ emergencyContactPhone ของพนักงานมาใช้เป็นหมายเลขฉุกเฉินของสถานี

ระบบต้องปฏิเสธการเปิด public feedback ของสถานีที่ยังไม่มี publicEmergencyPhone

ตอน activate primary STATION QR ให้ตรวจ Station.isActive และ publicEmergencyPhone ก่อนแล้วจึงตั้ง QR.isActive

ถ้าแก้ publicEmergencyPhone เป็นค่าว่างหรือปิด Station ที่มี active feedback QR ให้ API ปฏิเสธจนกว่าจะส่ง deactivateFeedbackQr เป็น true

เมื่อยืนยันให้ปิด STATION QR ทุกใบของสถานีนั้นและสร้าง AuditLog ใน transaction เดียวกัน

### 12.2 CustomerFeedbackQr

| ฟิลด์ | ชนิด | กติกา |
|---|---|---|
| id | String | cuid และ primary key |
| tokenHash | String | SHA-256 ของ token สำหรับค้นหาและ unique |
| tokenCiphertext | String | token ที่เข้ารหัสไว้เพื่อพิมพ์ซ้ำ |
| tokenHint | String | suffix 6 ตัวท้ายสำหรับตรวจป้าย |
| manualCodeHash | String | HMAC-SHA-256 ของรหัสกรอกเอง 8 ตัวด้วย server pepper และ unique |
| manualCodeCiphertext | String | รหัสกรอกเองที่เข้ารหัสไว้เพื่อพิมพ์ซ้ำ |
| manualCodeHint | String | 2 ตัวท้ายสำหรับตรวจป้ายในหน้า admin |
| targetType | FeedbackTargetType | EMPLOYEE หรือ STATION |
| employeeId | String nullable | มีค่าเมื่อ targetType เป็น EMPLOYEE |
| stationId | String nullable | มีค่าเมื่อ targetType เป็น STATION |
| publicLabel | String | ชื่อที่อนุญาตให้แสดงต่อสาธารณะ |
| publicPosition | String nullable | ตำแหน่งสาธารณะหรือ “พนักงานบริการ” และ null ได้สำหรับ STATION |
| publicProfileApprovedAt | DateTime nullable | วันที่พนักงานรับทราบข้อมูลที่จะแสดง |
| publicProfileApprovedById | String nullable | HR หรือ ADMIN ผู้บันทึกและใช้ onDelete SetNull |
| placement | FeedbackQrPlacement | จุดติดตั้ง |
| placementKey | String | รหัสจุด เช่น MAIN, CASHIER_01 หรือ PUMP_03 |
| serviceAreaKey | String nullable | ส่วนบริการที่ QR จุดย่อยเลือกไว้ล่วงหน้า |
| isPrimary | Boolean | QR หลักของเป้าหมาย |
| isActive | Boolean | default false และเปิดได้หลังผ่านกติกาของ target กับพิมพ์แล้ว |
| isTest | Boolean | โหมดทดสอบที่ snapshot ลง Visit ตอน resolve |
| needsReprint | Boolean | default true และต้องสร้างป้ายใหม่ก่อน activate |
| version | Int | เพิ่มเมื่อหมุน token |
| createdById | String nullable | ผู้สร้างและใช้ onDelete SetNull |
| rotatedAt | DateTime nullable | วันที่หมุนล่าสุด |
| revokedAt | DateTime nullable | วันที่ปิด |
| lastResolvedAt | DateTime nullable | ครั้งล่าสุดที่เปิดแบบประเมินสำเร็จ |
| lastPrintedAt | DateTime nullable | ครั้งล่าสุดที่สร้างไฟล์พิมพ์ |
| lastPrintedById | String nullable | ผู้สร้างไฟล์พิมพ์ล่าสุดและใช้ onDelete SetNull |
| createdAt | DateTime | เวลาสร้าง |
| updatedAt | DateTime | เวลาแก้ล่าสุด |

ฐานข้อมูลต้องมี check constraint ให้ EMPLOYEE มี employeeId อย่างเดียวและ STATION มี stationId อย่างเดียว

CustomerFeedbackQr ห้ามใช้ targetType UNKNOWN

EMPLOYEE QR ที่ isActive เป็น true ต้องมี publicLabel, publicPosition และ publicProfileApprovedAt

EMPLOYEE QR ต้องมี isPrimary เป็น true, placement เป็น EMPLOYEE_BADGE และ placementKey เป็น EMPLOYEE_PRIMARY

ฐานข้อมูลต้องมี partial unique index ตาม employeeId สำหรับ EMPLOYEE QR ที่ active โดยไม่พึ่ง isPrimary

ฐานข้อมูลต้องมี partial unique index สำหรับ QR active หลักของสถานีหนึ่งแห่ง

ฐานข้อมูลต้องมี partial unique index ตาม stationId, placement และ placementKey สำหรับ QR จุดย่อยที่ active

CustomerFeedbackQr ไป User ใช้ onDelete Cascade เพื่อให้ลบ QR ที่ยังไม่มีคำตอบพร้อมพนักงานได้

CustomerFeedbackQr ไป Station ใช้ onDelete Restrict เพราะสถานีที่มี QR ต้องปิดใช้งานแทนการลบ

QR ที่มีคำตอบห้ามถูก hard delete ผ่าน API

เมื่อ User.isActive เป็น false หรือ employeeStatus ออกจากสถานะทำงาน ให้ route พนักงานปิด EMPLOYEE QR ใน transaction เดียวกัน

สร้าง helper กลางสำหรับเปลี่ยนสถานะพนักงานและปิด EMPLOYEE QR แล้วเรียกจาก route รายคน, DELETE แบบกลุ่มใน `src/app/api/admin/employees/route.ts` และ action change-status ใน `src/app/api/admin/employees/bulk/route.ts`

ห้ามให้ route ใดเขียน User.isActive หรือ employeeStatus เป็นสถานะหยุดงานโดยข้าม helper นี้

เมื่อเปิดพนักงานกลับมาให้ผู้ดูแล activate QR ด้วยตนเองหลังตรวจ public profile และป้าย

การแก้ publicLabel หรือ publicPosition ต้องปิด QR ล้าง publicProfileApprovedAt และ publicProfileApprovedById ตั้ง needsReprint เป็น true และสร้าง AuditLog ใน transaction เดียวกัน

การ rotate token หรือ manual code ต้องปิด QR และตั้ง needsReprint เป็น true

MARK_PRINTED ตั้ง needsReprint เป็น false และการ activate ต้องตรวจ approval กับ needsReprint ก่อน

### 12.3 CustomerFeedbackVisit

| ฟิลด์ | ชนิด | กติกา |
|---|---|---|
| id | String | visit id |
| qrCodeId | String nullable | QR ที่เปิดและ null ได้เฉพาะ incident ที่เริ่มก่อน resolve |
| parentVisitId | String nullable | visit เดิมเมื่อผู้ใช้สลับไปแจ้งเหตุและ unique |
| qrVersionAtOpen | Int nullable | version ของ QR ตอนเปิดและ null เมื่อไม่มี QR |
| visitKind | FeedbackVisitKind | STANDARD หรือ INCIDENT |
| surveyVersion | String | employee-v1, station-v1 หรือ incident-v1 ที่ token นี้ส่งได้ |
| disposition | FeedbackVisitDisposition | สถานะของ visit สำหรับ funnel |
| blockedReason | String nullable | เหตุผลที่ bot หรือ risk rule ปิด flow |
| isTestAtOpen | Boolean | snapshot โหมดทดสอบของ QR ตอน resolve |
| sessionTokenHash | String | hash ของ signed visit token |
| networkHashDaily | String nullable | HMAC ของ network signal ที่เปลี่ยน secret ทุกวันและไม่เก็บ IP ดิบ |
| clientHashWeekly | String nullable | HMAC ของ client signal ที่เปลี่ยน secret ทุกสัปดาห์ |
| resolveNonceHash | String nullable | HMAC ของ clientNonce สำหรับ idempotency และ cooldown ของแท็บ |
| hashKeyVersion | String nullable | รุ่น secret ที่ใช้สร้าง hash |
| targetType | FeedbackTargetType | snapshot ประเภทเป้าหมาย |
| employeeId | String nullable | snapshot พนักงานตอนเปิด |
| stationIdAtOpen | String nullable | สถานีที่ระบบหาได้ตอนเปิด |
| stationIdSelected | String nullable | สถานีที่ลูกค้าแก้หรือเลือกภายหลัง |
| stationContextSource | String | TOKEN, CURRENT_TRANSFER, CURRENT_ATTENDANCE, USER_STATION, CUSTOMER_SELECTED หรือ UNKNOWN |
| departmentIdAtOpen | String nullable | แผนกตอนเปิด |
| shiftIdAtOpen | String nullable | กะตอนเปิด |
| deviceClass | String nullable | mobile, tablet หรือ desktop แบบกว้าง |
| language | String | th หรือ en |
| variantKey | String nullable | รุ่นการทดลองหน้าจอ |
| optionOrder | Json nullable | ลำดับตัวเลือกที่แสดง |
| targetConfirmation | String nullable | YES, NO หรือ UNSURE |
| openedAt | DateTime | เวลาเปิด |
| startedAt | DateTime nullable | เวลาเริ่มตอบ |
| submittedAt | DateTime nullable | เวลาส่ง |
| lastStep | String nullable | ขั้นที่ออก |
| formExpiresAt | DateTime | เวลาหมดอายุ signed form เริ่มต้น 30 นาที |
| purgeAfter | DateTime | วันล้าง Visit เริ่มต้น 90 วันหลัง aggregate |

Visit ใช้คำนวณ scan-to-submit rate และ drop-off

resolve ที่หารหัสไม่พบ ถูกปิด หรือถูก rate limit ก่อนสร้าง Visit ให้นับใน CustomerFeedbackResolveDailyAggregate และห้ามสร้าง Visit เปล่า

เมื่อพ้น formExpiresAt โดย startedAt มีค่าและยังไม่ส่งให้ถือเป็น ABANDONED

เมื่อพ้น formExpiresAt โดยยังไม่เริ่มตอบให้ถือเป็น EXPIRED

query funnel ต้องคำนวณ effective disposition จาก formExpiresAt ได้แม้ maintenance ยังไม่ได้อัปเดตแถว

เมื่อส่ง child incident สำเร็จ ให้เปลี่ยน parent ที่ยัง OPEN เป็น SWITCHED_TO_INCIDENT ใน transaction เดียวกัน

ถ้า parent เป็น SUBMITTED, ABANDONED หรือ EXPIRED ให้คงสถานะเดิมเมื่อ child incident ส่งสำเร็จ

ถ้าลูกค้าออกจาก incident ก่อนส่ง parent ยังใช้งานต่อได้จนถึง formExpiresAt

เมื่อส่งสำเร็จให้ visit ของ response เป็น SUBMITTED

networkHashDaily และ clientHashWeekly เป็นสัญญาณความเสี่ยงและห้ามใช้เป็นตัวระบุตัวบุคคล

STANDARD Visit ต้องมี qrCodeId และ targetType เป็น EMPLOYEE หรือ STATION

INCIDENT Visit มี qrCodeId เป็น null และ targetType เป็น UNKNOWN ได้

relation จาก Visit ไป QR ใช้ onDelete Cascade เพราะ Visit ที่ยังไม่มี Response ลบพร้อม QR ที่ไม่เคยใช้งานได้

relation จาก child Visit ไป parent Visit ใช้ onDelete SetNull

### 12.4 CustomerFeedbackResponse

| ฟิลด์ | ชนิด | กติกา |
|---|---|---|
| id | String | response id |
| refCode | String | เลขอ้างอิงแบบอ่านได้และ unique |
| visitId | String nullable | unique ขณะ visit ยังอยู่และใช้ onDelete SetNull |
| qrCodeId | String nullable | QR ต้นทางและ null ได้เฉพาะ INCIDENT ที่เริ่มก่อน resolve |
| qrVersionAtSubmit | Int nullable | version ของ QR ตอนส่งและ null เมื่อ INCIDENT ไม่มี QR |
| kind | FeedbackResponseKind | STANDARD หรือ INCIDENT |
| targetType | FeedbackTargetType | snapshot ประเภทเป้าหมาย |
| employeeId | String nullable | พนักงานที่ถูกประเมิน |
| stationId | String nullable | สถานีที่เกิดบริการและ null ได้เฉพาะ INCIDENT ที่ระบุไม่ได้ |
| departmentIdAtSubmit | String nullable | แผนกตอนเกิดบริการ |
| shiftIdAtSubmit | String nullable | กะตอนเกิดบริการ |
| departmentLabelSnapshot | String nullable | ชื่อแผนกตอนส่ง |
| shiftLabelSnapshot | String nullable | รหัสและชื่อกะตอนส่ง |
| stationContextSource | String | แหล่งที่มาของสถานี |
| employeeLabelSnapshot | String nullable | ชื่อสาธารณะ ณ วันที่ส่ง |
| stationLabelSnapshot | String nullable | ชื่อสถานี ณ วันที่ส่ง |
| surveyVersion | String | employee-v1, station-v1 หรือ incident-v1 |
| privacyNoticeVersion | String | รุ่นประกาศที่ลูกค้าเห็น |
| language | String | ภาษาที่ตอบ |
| serviceAreas | String array | ส่วนบริการ |
| overallRating | Int nullable | 1–5 สำหรับ STANDARD และ null สำหรับ INCIDENT |
| reasonKeys | String array | สาเหตุที่เลือก |
| incidentKey | String nullable | ประเภทเหตุและบังคับเมื่อ kind เป็น INCIDENT |
| dangerStatus | FeedbackDangerStatus nullable | สถานะอันตรายปัจจุบันและบังคับเมื่อเป็น INCIDENT |
| occurredAt | DateTime nullable | เวลาเกิดเหตุที่ลูกค้าแก้ได้และบังคับเมื่อเป็น INCIDENT |
| noDetail | Boolean | ลูกค้าเลือกไม่สะดวกให้รายละเอียด |
| comment | String nullable | plain text และจำกัดความยาว |
| wantsFollowUp | Boolean | ต้องการให้ติดต่อกลับ |
| validity | FeedbackValidity | สถานะความน่าเชื่อถือ |
| abuseScore | Int | คะแนนความเสี่ยงภายใน |
| abuseReasons | String array | เหตุผลติดธง |
| idempotencyKeyHash | String | unique ต่อการกดส่งหนึ่งครั้ง |
| idempotencyPayloadHash | String | digest ของ QR, visit และ payload ที่ใช้ตรวจ key ซ้ำต่างเนื้อหา |
| durationSeconds | Int | เวลาที่ใช้ |
| reportDate | DateTime @db.Date | วันที่รายงานตาม Asia/Bangkok |
| submittedAt | DateTime | เก็บ UTC และ format เป็น Asia/Bangkok ตอนแสดงผล |
| createdAt | DateTime | เวลา record |

เพิ่ม index ตาม stationId และ submittedAt

เพิ่ม index ตาม employeeId และ submittedAt

เพิ่ม index ตาม overallRating และ submittedAt

เพิ่ม index ตาม validity และ submittedAt

เพิ่ม index ตาม reportDate และ validity

เพิ่ม unique index ให้ idempotencyKeyHash

ถ้า Visit.targetConfirmation เป็น NO หรือ UNSURE ระบบไม่สร้าง CustomerFeedbackResponse

visits/progress ต้องเก็บ NO หรือ UNSURE แล้วตั้ง disposition เป็น TARGET_REJECTED ใน transaction เดียวกัน

การเรียก visits/progress ซ้ำด้วยค่าเดิมคืนผลเดิมและการเปลี่ยนคำตอบหลัง TARGET_REJECTED ต้องเริ่ม Visit ใหม่

STANDARD response ต้องมี stationId และ overallRating

STANDARD response ต้องมี qrCodeId และ targetType เป็น EMPLOYEE หรือ STATION

INCIDENT response ต้องมี incidentKey, dangerStatus, occurredAt และมี overallRating เป็น null ได้

INCIDENT ส่งได้แม้ยังระบุ stationId ไม่ได้และใช้ stationContextSource เป็น UNKNOWN ในกรณีนั้น

INCIDENT ที่เริ่มก่อน resolve ใช้ targetType เป็น UNKNOWN และ qrCodeId เป็น null

ฐานข้อมูลต้องมี check constraint แยกฟิลด์บังคับของ STANDARD และ INCIDENT

relation employee ใช้ onDelete SetNull และ snapshot รักษาประวัติ

relation station และ qrCode ใช้ onDelete Restrict

การลบ Visit ตาม retention ต้อง set visitId ใน Response เป็น null โดยไม่ลบคำตอบ

src/lib/employee-removal.ts ต้องนับ feedback response และ CustomerFeedbackReviewRequest ที่เป็น OPEN หรือ IN_REVIEW ก่อน hard delete พนักงาน

src/app/api/admin/employees/[id]/route.ts ต้องเรียก guard เดียวกันและห้าม hard delete เมื่อมี feedback response

ถ้าพนักงานไม่มี feedback response การลบพนักงานสามารถ cascade ลบ QR และ Visit ที่ยังไม่ส่งคำตอบได้

### 12.5 CustomerFeedbackContact

| ฟิลด์ | ชนิด | กติกา |
|---|---|---|
| id | String | primary key |
| responseId | String | unique และ one-to-one |
| channel | FeedbackContactChannel | PHONE หรือ EMAIL |
| nameEncrypted | String nullable | เข้ารหัสด้วย helper เดิม |
| valueEncrypted | String | เบอร์หรืออีเมลที่เข้ารหัส |
| preferredTime | String nullable | ช่วงเวลาที่สะดวก |
| consentAt | DateTime | เวลาที่ขอติดต่อ |
| purgeAfter | DateTime | เริ่มที่ createdAt + 120 วันและลดได้ตามวันปิดเคส |
| createdAt | DateTime | เวลาสร้าง |

API รายการคำตอบทั่วไปห้าม include relation นี้

การถอดรหัสทำเฉพาะ endpoint ที่ตรวจ customer_feedback.view_contact

ห้ามบันทึกค่าที่ถอดรหัสใน console, error message หรือ AuditLog

relation จาก Contact ไป Response ใช้ onDelete Cascade

เมื่อสร้าง Contact ให้ตั้ง purgeAfter เป็น createdAt + 120 วันใน transaction เดียวกัน

เมื่อปิดหรือยกเลิกเคสแล้วไม่เหลือเคส OPEN หรือ IN_PROGRESS ของ Response นั้น ให้ตั้ง purgeAfter เป็นวันที่เร็วที่สุดระหว่างค่าเดิมกับวันปิดเคสล่าสุด + 30 วัน

การคำนวณ purgeAfter ห้ามขยายวันเก็บข้อมูลออกไปจากค่าเดิม

### 12.6 CustomerFeedbackCase

| ฟิลด์ | ชนิด | กติกา |
|---|---|---|
| id | String | primary key |
| responseId | String | unique ต่อคำตอบ |
| stationId | String nullable | ใช้กำหนด scope และ null ได้ก่อน ADMIN หรือ HR ระบุสถานี |
| severity | FeedbackCaseSeverity | NORMAL, HIGH หรือ URGENT |
| category | String | incident key หรือ follow-up |
| status | FeedbackCaseStatus | สถานะงาน |
| assignedToId | String nullable | ผู้รับผิดชอบ |
| dueAt | DateTime | SLA |
| acknowledgedAt | DateTime nullable | เวลารับทราบ |
| resolutionNote | String nullable | วิธีจัดการ |
| dismissedReason | String nullable | เหตุผลยกเลิก |
| resolvedAt | DateTime nullable | เวลาปิด |
| createdAt | DateTime | เวลาสร้าง |
| updatedAt | DateTime | เวลาแก้ |

เคสที่ stationId เป็น null แสดงเฉพาะ ADMIN และ HR จนกว่าจะระบุสถานี

relation จาก Case ไป Response ใช้ onDelete Cascade ตาม retention ที่ยืนยันแล้ว

### 12.7 คำตอบแบบ normalized

MVP ต้องสร้าง CustomerFeedbackAnswer เพื่อแยกคำถามที่ตอบ ข้าม และไม่ถูกแสดงตาม branching

CustomerFeedbackAnswer มี responseId, surveyVersion, questionKey, state, numberValue, textValue และ choiceValues

กำหนด unique ตาม responseId และ questionKey

validator ของแต่ละ survey version เป็นผู้สร้าง state ANSWERED, SKIPPED หรือ NOT_SHOWN ฝั่ง server

overallRating, reasonKeys และ serviceAreas ใน Response เป็นคอลัมน์สรุปที่เขียนจาก answer ชุดเดียวกันภายใน transaction

ห้ามเก็บทุกอย่างไว้ใน JSON เพียงช่องเดียวเมื่อข้อมูลนั้นต้องใช้กรองและรวมผล

relation จาก Answer ไป Response ใช้ onDelete Cascade

### 12.8 CustomerFeedbackRateBucket

ตารางนี้ใช้เป็น persistent rate limit เมื่อยังไม่มี Redis หรือ shared limiter

ฟิลด์หลักมี action, keyHash, windowStart, count และ expiresAt

กำหนด unique ตาม action, keyHash และ windowStart

การเพิ่ม count ต้องเป็นคำสั่งฐานข้อมูลแบบ atomic

ข้อมูล rate bucket ลบภายใน 48 ชั่วโมง

### 12.9 CustomerFeedbackAlertLog

ตารางนี้เก็บ alert ที่ส่งแล้วและป้องกันการส่งซ้ำ

ฟิลด์หลักมี ruleCode, ruleVersion, targetType, targetId แบบ non-null, windowStart, windowEnd, status, notifiedAt, resolvedAt และ details

กฎระดับทั้งระบบใช้ targetId เป็น GLOBAL และห้ามใช้ null

กำหนด unique ตาม ruleCode, ruleVersion, targetId และ windowStart

ทุก alert rule ต้องมี minimum sample และ cooldown

details ห้ามเก็บ comment ข้อมูลติดต่อ token IP หรือ client hash

### 12.10 CustomerFeedbackDailyAggregate

ตารางนี้เก็บ funnel ก่อนลบ Visit และใช้เป็นข้อมูลถาวรสำหรับแนวโน้ม

มิติหลักมี reportDate, stationKey แบบ snapshot, targetType, placementKey แบบ String, language, surveyVersion และ isTest แบบ Boolean

ค่าหลักมี openedCount, startedCount, confirmedCount, targetRejectedCount, submittedCount, switchedIncidentCount, abandonedCount, botBlockedCount, expiredCount, validCount, suspectedCount, ratingSum และ ratingCount

ทุกมิติเป็น non-null กำหนด unique ตามมิติทั้งหมดและใช้ UNKNOWN หรือ NO_QR ในมิติ String ที่ไม่มีข้อมูล

maintenance job ต้อง upsert aggregate แบบ idempotent และ reconcile ยอดกับ Visit ก่อนลบ Visit

### 12.11 CustomerFeedbackResolveDailyAggregate

ตารางนี้เก็บผล resolve ที่เกิดก่อนรู้ QR และแยกจาก funnel ของ Visit

มิติ non-null มี reportDate, resolverType เป็น TOKEN, MANUAL_CODE หรือ STANDALONE_INCIDENT และ result เป็น SUCCESS, INVALID, INACTIVE หรือ RATE_LIMITED

ฟิลด์ count เพิ่มแบบ atomic และกำหนด unique ตาม reportDate, resolverType กับ result

resolve API ต้องเพิ่ม counter โดยไม่เก็บ token, manual code, IP หรือ client hash

### 12.12 CustomerFeedbackDailyReasonAggregate

ตารางนี้รักษาแนวโน้ม reason key หลังลบ Response และ Answer รายรายการ

มิติ non-null มี reportDate, stationKey, targetType, reasonKey, surveyVersion และ isTest

ค่าหลักมี validCount และ suspectedCount

กำหนด unique ตามมิติทั้งหมดและ maintenance ต้อง reconcile ก่อนลบ Response

### 12.13 CustomerFeedbackReviewSnapshot

ตารางนี้ใช้เก็บหลักฐานสรุปเมื่อปิด ReviewPeriod

ฟิลด์หลักมี reviewPeriodId, employeeId แบบ nullable, employeeLabelSnapshot, dateFrom, dateTo, validCount, ratingAverage, positiveRate, negativeRate, suspectedExcludedCount, topReasonKeys, generatedAt และ generatedById แบบ nullable

กำหนด unique ตาม reviewPeriodId และ employeeId

snapshot ไม่เก็บ comment ดิบและ API ของพนักงานบังคับ employeeId จาก session

relation employee ใช้ onDelete SetNull, reviewPeriod ใช้ onDelete Restrict และ generatedBy ใช้ onDelete SetNull

เพิ่ม closedAt และ closedById แบบ nullable ใน ReviewPeriod โดย closedBy ใช้ onDelete SetNull

การปิดรอบต้อง set isActive เป็น false และสร้าง ReviewSnapshot ใน transaction เดียวกัน

### 12.14 CustomerFeedbackReviewRequest

ตารางนี้ให้พนักงานขอให้ HR ทบทวนหลักฐานที่สงสัยว่าไม่เป็นธรรมหรือเป็นการกลั่นแกล้ง

ฟิลด์หลักมี id, employeeId แบบ nullable, employeeLabelSnapshot, reviewPeriodId แบบ nullable, scopeKey แบบ non-null, reason จำกัด 500 ตัวอักษร, status, reviewedById แบบ nullable, resolutionNote แบบ nullable, submittedAt, resolvedAt และ updatedAt

employeeId มาจาก session เท่านั้น โดย relation employee และ reviewedBy ใช้ onDelete SetNull

คำขอ OPEN หรือ IN_REVIEW ต้องมี employeeId และ hard-delete guard ต้องปฏิเสธการลบพนักงานจนกว่าคำขอจะปิด

คำขอที่ปิดแล้วเก็บ employeeLabelSnapshot ไว้ได้เมื่อ employeeId ถูก SetNull ตาม retention

scopeKey ใช้ ReviewPeriod.id หรือ GENERAL และฐานข้อมูลมี partial unique เฉพาะแถวที่ employeeId ไม่เป็น null เพื่อให้พนักงานมีคำขอ OPEN หรือ IN_REVIEW ได้หนึ่งรายการต่อ scopeKey

คำขอทบทวนไม่เปิดเผย comment ดิบหรือข้อมูลผู้ตอบให้พนักงาน

### 12.15 CustomerFeedbackOperationalMetricBucket

ตารางนี้เก็บจำนวน request สำหรับ health alert โดยไม่เก็บตัวระบุผู้ใช้

ฟิลด์หลักมี minuteStart, metricCode, outcome เป็น SUCCESS, CLIENT_ERROR, SERVER_ERROR หรือ RATE_LIMITED, statusClass และ count

กำหนด unique ตาม minuteStart, metricCode, outcome กับ statusClass และเพิ่ม count แบบ atomic

ข้อมูลเก็บ 30 วันและห้ามมี token, manual code, IP, client hash, comment หรือ contact

## 13. Token และ URL

token จริงสร้างจาก crypto random อย่างน้อย 128 bits

token ใช้ base64url เพื่อให้ URL สั้นและสแกนง่าย

ฐานข้อมูลเก็บ SHA-256 ใน tokenHash และเก็บ token ที่เข้ารหัสใน tokenCiphertext

ระบบใช้ tokenHash สำหรับ resolve และถอด tokenCiphertext เฉพาะตอนพิมพ์ซ้ำ

รหัสกรอกเองใช้ 8 ตัวจากชุดอักษรที่ตัด 0, O, 1 และ I ออก

ฐานข้อมูลเก็บ HMAC-SHA-256 ใน manualCodeHash และเก็บรหัสกรอกเองแบบเข้ารหัสสำหรับพิมพ์ซ้ำ

เพิ่ม CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY ใน .env.example และ production ต้องไม่มีค่า fallback

ถ้าเปลี่ยน HMAC key ต้อง rotate manual code ทุก QR และพิมพ์ป้ายใหม่

หน้า /f อ่าน token จาก URL fragment หรือรหัสที่ลูกค้ากรอกแล้วส่งให้ resolve API ใน request body

URL fragment ไม่ถูกส่งไปยังเว็บเซิร์ฟเวอร์ CDN หรือ proxy

เมื่อ resolve สำเร็จ browser ต้องลบ fragment ด้วย history.replaceState และเก็บ signed visit token กับร่างที่ไม่อ่อนไหวตามหัวข้อ 9.4 ใน sessionStorage

ระบบห้ามใช้ timestamp หรือรหัสสถานีเป็น entropy หลัก

APP_BASE_URL อยู่ใน .env.example

API admin ส่ง qrUrl, manualEntryUrl และ manualCode ที่ประกอบจากข้อมูลฝั่ง server

ระบบ validate scheme และ host ก่อนพิมพ์

ระบบไม่ log token รหัสกรอกเอง request body หรือ signed visit token

หน้า admin แสดง token suffix 6 ตัวท้ายเพื่อช่วยตรวจป้าย

การ rotate ทำใน transaction

transaction อัปเดต token รหัสกรอกเอง version rotatedAt และ AuditLog พร้อมกัน

signed form token ของ STANDARD ต้องมี qrVersion และ server ต้องเทียบกับ QR.version ปัจจุบันทุกครั้งที่ส่ง

การ rotate ทำให้ STANDARD form ที่เปิดด้วย version เก่าส่งต่อไม่ได้และหน้าแจ้งให้สแกนป้ายใหม่

INCIDENT form ที่สร้างแล้วส่งต่อได้ตามอายุ token เพื่อไม่ให้เหตุเร่งด่วนหายจากการ rotate

คำตอบเก่ายังชี้ QR row เดิมและยังอ่านรายงานได้

QR token เป็นตัวบอกปลายทางสาธารณะและไม่ใช่รหัสเข้าสู่ระบบ

QR token ห้ามให้สิทธิ์อ่านข้อมูลภายใน

## 14. API ที่ต้องสร้าง

### 14.1 Public

| Method | Route | งาน |
|---|---|---|
| GET page | /f | แสดง shell แบบประเมินและช่องกรอกรหัสสำรองโดยยังไม่เผยเป้าหมาย |
| POST | /api/public/customer-feedback/resolve | รับ token หรือรหัสกรอกเอง สร้าง Visit และคืน signed form token พร้อมข้อมูลสาธารณะขั้นต่ำ |
| POST | /api/public/customer-feedback/submissions | validate และบันทึกคำตอบ |
| POST | /api/public/customer-feedback/incidents/start | สร้าง INCIDENT Visit จาก parent token หรือเริ่มแบบ UNKNOWN |
| POST | /api/public/customer-feedback/incidents | บันทึกเหตุเร่งด่วน |
| POST | /api/public/customer-feedback/visits/progress | บันทึก startedAt, lastStep และ targetConfirmation แบบ idempotent |
| GET | /api/public/customer-feedback/stations | ค้นหาสถานีขั้นต่ำตามสิทธิ์ของ signed Visit |
| GET page | /feedback/privacy | แสดงประกาศความเป็นส่วนตัว |

หน้า /f เป็น Server Component ที่ส่งเฉพาะค่าคงที่ให้ Client Component แล้ว resolve เป้าหมายผ่าน POST

เพิ่ม /f และ /feedback ใน noShellPrefixes ของ AppShell

route สาธารณะห้ามแสดง BottomNavigation, GlobalAnnouncementModal หรือเมนูพนักงาน

public API ไม่ต้องมี session และทุก endpoint หลัง resolve ต้องตรวจ signed visit token

client ส่ง signed visit token ใน Authorization: Bearer เท่านั้น

ห้ามส่ง signed visit token ใน URL, query string, path, cookie หรือ request body

public API อนุญาต same-origin เท่านั้นและ CORS allow headers เฉพาะ Content-Type, Authorization, Idempotency-Key และ Resolve-Idempotency-Key ที่จำเป็น

resolve endpoint ตรวจ raw token หรือ manual code พร้อม persistent rate limit

incident start ที่ไม่มี parent token ใช้ persistent rate limit ชุดเดียวกับ resolve และคืนข้อมูลกลาง

resolve และ incident start แบบ UNKNOWN เป็นสองกรณีที่สร้าง signed visit token ได้โดยยังไม่มี signed token เดิม

manual code resolver นับเฉพาะการลองรหัสที่ไม่สำเร็จและเมื่อ resolveNonceHash เดิมผิด 5 ครั้งในหนึ่งนาทีให้ตอบ 429 พร้อม Retry-After 60 วินาที

ถ้า resolveNonceHash เดิมผิด 60 ครั้งใน 10 นาทีให้พักการลองของแท็บนั้น 10 นาที

networkHashDaily ใช้เพิ่ม risk score และห้ามใช้ hard block รายวันเพียงค่าเดียว

ตัวตัดวงจรทั้งระบบเริ่มที่ invalid resolve 3,000 ครั้งต่อนาทีและต้องแจ้งเตือนผู้ดูแลเมื่อทำงาน

token resolver ใช้กติกา invalid attempt ชุดเดียวกันและคืนข้อความกลางเหมือนกันทั้งรหัสผิดกับรหัสปิด

successful resolve จาก Wi-Fi ร่วมกันไม่ถูกนับเป็น invalid attempt

browser สร้าง clientNonce แบบสุ่มใน sessionStorage และส่ง Resolve-Idempotency-Key ต่อการเปิดหนึ่งครั้ง

resolve ซ้ำด้วย token, clientNonce และ idempotency key เดิมภายใน 30 นาทีต้องคืน Visit เดิม

จำกัดการสร้าง Visit ใหม่ 30 รายการต่อชั่วโมงต่อ resolveNonceHash โดยไม่ hard block จาก networkHashDaily หรือ clientHashWeekly ค่าเดียว

ตัวตัดวงจร successful resolve ทั้งระบบเริ่มที่ 10,000 ครั้งต่อนาทีและต้องแจ้ง ADMIN เมื่อทำงาน

QR ที่มี successful resolve พุ่งผิดปกติให้เพิ่ม risk และ alert โดยไม่ปิด QR อัตโนมัติ

station search ต้องตรวจ signed Visit, รับคำค้นอย่างน้อย 2 ตัวอักษร, คืนไม่เกิน 20 รายการ และคืนเฉพาะ id, public name กับ publicEmergencyPhone

EMPLOYEE STANDARD Visit คืนสถานีที่ผ่าน `isEmployeeFeedbackStationEligible`

STATION STANDARD Visit ล็อกสถานีจาก QR และไม่เปิด station search

INCIDENT Visit คืนสถานีที่ผ่าน `isEmployeeFeedbackStationEligible`

station search ใช้ persistent rate limit และห้ามคืน address, พิกัด, QR token หรือข้อมูลพนักงาน

public page และ public API ส่ง Cache-Control: no-store

public page ส่ง Referrer-Policy: no-referrer

public page ไม่โหลด analytics script หรือ widget จากบริษัทอื่น

ถ้าพบ session พนักงานและกำลังประเมิน QR ของตน ให้ปฏิเสธคำตอบ

บัญชีพนักงานที่ล็อกอินอยู่ให้ใช้ช่องทาง feedback ภายในแทน

### 14.2 Admin

| Method | Route | งาน |
|---|---|---|
| GET | /api/admin/customer-feedback/summary | KPI และกราฟตาม filter |
| GET | /api/admin/customer-feedback/responses | รายการคำตอบแบบแบ่งหน้า |
| GET | /api/admin/customer-feedback/responses/[id] | รายละเอียดตามสิทธิ์ |
| GET | /api/admin/customer-feedback/responses/[id]/contact | ถอดรหัสข้อมูลติดต่อพร้อม AuditLog |
| PATCH | /api/admin/customer-feedback/responses/[id] | เปลี่ยน validity และเหตุผล |
| GET | /api/admin/customer-feedback/cases | คิวเคส |
| POST | /api/admin/customer-feedback/cases | ผู้ดูแลสร้างเคสจากคำตอบ |
| PATCH | /api/admin/customer-feedback/cases/[id] | assign, acknowledge, resolve, dismiss |
| GET | /api/admin/customer-feedback/qr-codes | รายการ QR |
| POST | /api/admin/customer-feedback/qr-codes | สร้าง QR |
| PATCH | /api/admin/customer-feedback/qr-codes/[id] | ปิด เปิด หมุน แก้ label และบันทึก MARK_PRINTED |
| GET | /api/admin/customer-feedback/export | export CSV หรือ XLSX |
| GET | /api/admin/customer-feedback/questions | อ่าน question registry |
| GET | /api/admin/customer-feedback/review-requests | รายการคำขอทบทวน |
| PATCH | /api/admin/customer-feedback/review-requests/[id] | รับงาน ปิด หรือยกเลิกคำขอทบทวน |
| POST | /api/admin/performance/periods/[id]/close | ปิด ReviewPeriod และสร้าง snapshot ใน transaction |

ทุก list API ต้องมี pagination และจำกัด page size

ทุก filter ต้อง validate ค่าและช่วงวันที่

MANAGER scope ต้องใส่ stationId ใน where ของ query ฝั่ง server

summary ตรวจ customer_feedback.view_dashboard

responses และ comment ดิบตรวจ customer_feedback.view_response

incident detail ตรวจ customer_feedback.view_incident เพิ่มจาก permission ดู response

response list ต้องตัด INCIDENT row ออกทั้งหมดเมื่อผู้ใช้ไม่มี customer_feedback.view_incident

summary และ export ต้องตัด incident count, incidentKey, dangerStatus, occurredAt และ incident comment เมื่อผู้ใช้ไม่มี customer_feedback.view_incident

serializer ใช้ field allowlist ตาม kind และ permission และห้ามส่ง Prisma object ทั้งแถวตรง ๆ

contact endpoint ตรวจ customer_feedback.view_contact และสร้าง AuditLog แบบ fail closed ก่อนคืนค่าที่ถอดรหัส

contact endpoint ห้ามใช้ `logActivity` เดิมเพราะ helper นี้กลืน error

เพิ่ม helper สำหรับ sensitive access ที่ throw เมื่อเขียน AuditLog ไม่สำเร็จ หรือสร้าง AuditLog โดยตรงใน transaction แล้วจึงคืนข้อมูลติดต่อ

ถ้าเขียน AuditLog ไม่สำเร็จ endpoint ต้องตอบ 500 โดยไม่มีข้อมูลติดต่อใน response

MANAGER ที่ไม่มี stationId ต้องได้ 403 ก่อน query ทุก endpoint

Export ปกติตัดข้อมูลติดต่อ abuseReasons และข้อมูลภายในออก

CSV export ต้องป้องกัน formula injection ในค่าที่ขึ้นต้นด้วยเครื่องหมายพิเศษ

### 14.3 พนักงาน

| Method | Route | งาน |
|---|---|---|
| GET | /api/customer-feedback/me | คืนผลสรุปของพนักงานที่ login และผ่าน minimum sample |
| GET | /api/customer-feedback/me/review-requests | ดูคำขอทบทวนของตนเอง |
| POST | /api/customer-feedback/me/review-requests | ส่งคำขอทบทวนของตนเอง |

endpoint นี้ตรวจ customer_feedback.self_view และใช้ employeeId จาก session เท่านั้น

endpoint นี้ไม่รับ employeeId จาก query หรือ request body

หน้า Performance เดิมเพิ่มส่วน “ความคิดเห็นจากลูกค้า” ที่อ่าน API นี้และไม่แสดง comment ดิบ

close endpoint ใช้ ADMIN หรือ HR, ปฏิเสธรอบที่ endDate ยังไม่ถึง และเรียกซ้ำได้โดยไม่สร้าง snapshot ซ้ำ

ถ้าการสร้าง snapshot ล้มเหลว transaction ต้องไม่เปลี่ยน isActive, closedAt หรือ closedById

## 15. Validation และกติกาการส่ง

โปรเจกต์ยังไม่มี Zod

สร้าง shared validator ที่ src/lib/customer-feedback/validation.ts

client และ server ใช้ type และ question registry ชุดเดียวกัน

server เป็นผู้ตัดสิน required rule และ branching rule

public STANDARD payload รับเฉพาะ targetConfirmation, selectedStationId, overallRating, reasonKeys, serviceAreas, comment, wantsFollowUp, contact และ language

public INCIDENT payload รับเฉพาะ selectedStationId, incidentKey, dangerStatus, occurredAt, noDetail, comment, wantsFollowUp, contact และ language

server ต้องปฏิเสธ key อื่นแทนการส่ง object เข้า Prisma โดยตรง

server derive kind, surveyVersion, qrCodeId, qrVersion, targetType, employeeId, stationId, stationContextSource, department, shift, label snapshot, privacyNoticeVersion, validity, abuse fields, duration, reportDate, submittedAt และ refCode จาก Visit, QR, session และเวลาฝั่ง server

EMPLOYEE STANDARD อนุญาต selectedStationId เฉพาะสถานีที่ผ่าน `isEmployeeFeedbackStationEligible` และ server เป็นผู้ map เป็น stationId

เมื่อรับ selectedStationId ให้ตั้ง Visit.stationIdSelected และ Response.stationContextSource เป็น CUSTOMER_SELECTED ใน submit transaction

STATION STANDARD ใช้ QR.stationId เท่านั้นและต้อง reject selectedStationId ที่ต่างจากสถานีใน QR

INCIDENT อนุญาต selectedStationId ที่ผ่าน `isEmployeeFeedbackStationEligible` แม้สถานีนั้นยังไม่มี Station QR และแสดงเฉพาะ 191 กับ 1669 เมื่อไม่มี publicEmergencyPhone

contact payload รับเฉพาะ consent, channel, value, name และ preferredTime โดย server เป็นผู้ตั้ง consentAt

PHONE ตัดช่องว่าง ขีด และวงเล็บก่อนตรวจรูปแบบ `+` แบบไม่บังคับตามด้วยตัวเลข 8–15 หลัก

EMAIL trim และแปลงส่วน domain เป็นตัวพิมพ์เล็ก ตรวจรูปแบบอีเมล และจำกัด 254 ตัวอักษร

name เป็นตัวเลือกและจำกัด 100 ตัวอักษร

preferredTime เป็นตัวเลือกจาก ANYTIME, MORNING, AFTERNOON หรือ EVENING เท่านั้น

client ห้ามกำหนด validity, abuseScore, abuseReasons, employeeId, qrCodeId, submittedAt หรือ consentAt

STANDARD ต้องมี targetConfirmation เป็น YES, stationId และ overallRating ที่เป็น integer 1–5

INCIDENT ไม่บังคับ overallRating และต้องมี incidentKey กับ danger status ที่อยู่ใน registry

INCIDENT ส่งได้โดยไม่มีรายละเอียดเมื่อ noDetail เป็น true และส่งได้โดยยังไม่ทราบ stationId

INCIDENT ต้องมี comment ที่ไม่ว่างหรือ noDetail เป็น true อย่างใดอย่างหนึ่งและห้ามส่งทั้งสองค่า

payload ที่ระบุ kind ไม่ตรงกับฟิลด์บังคับของ flow ต้องถูกปฏิเสธ

reasonKeys ต้องอยู่ใน registry ของ survey version นั้น

reasonKeys มีจำนวนไม่เกินที่กำหนด

คะแนน 1–2 ต้องมี reasonKeys อย่างน้อยหนึ่งค่า

unspecified ใน reasonKeys เป็นตัวเลือกเดี่ยวและอยู่ร่วมกับค่าอื่นไม่ได้

comment ของ Employee จำกัด 500 ตัวอักษร, Station จำกัด 300 ตัวอักษร และ Incident จำกัด 1,000 ตัวอักษรโดยเก็บเป็น plain text

serviceAreas ต้องอยู่ใน registry

unsure ใน serviceAreas เป็นตัวเลือกเดี่ยวและอยู่ร่วมกับค่าอื่นไม่ได้

contact payload ต้องมี consent เป็น true และช่องทางกับค่าติดต่อที่ผ่าน validation

wantsFollowUp เป็น true ต้องมี contact ที่ผ่าน validation และ wantsFollowUp เป็น false ต้องไม่มี contact

server ตั้ง consentAt จากเวลาปัจจุบันและสร้าง Response, Contact, Answer กับ Case ที่เกิดอัตโนมัติใน transaction เดียวกัน

request body ต้องมีขนาดสูงสุด

public POST รับเฉพาะ application/json

ตรวจ Origin หรือ Sec-Fetch-Site เมื่อ header มีค่า

signed form token ต้องผูกกับ visitId, visitKind, targetType, surveyVersion และ issuedAt

qrCodeId และ qrVersion ต้องอยู่ใน token ของ STANDARD และ child INCIDENT ที่มี QR ต้นทาง

qrCodeId และ qrVersion เป็น null ได้เฉพาะ standalone INCIDENT ที่ targetType เป็น UNKNOWN

surveyVersion ใน payload ต้องตรงกับ Visit และ signed form token

การสลับจากแบบปกติไป incident ต้องใช้ child Visit และ token ใหม่จาก incidents/start

feedback form token ใช้ minimum fill time ของตนเองและไม่ใช้ค่า 10 วินาทีของใบสมัครโดยตรง

ค่าเริ่มต้น minimum fill time คือ 3 วินาทีและ max age คือ 30 นาที

browser สร้าง Idempotency-Key ต่อการกดส่งหนึ่งครั้ง

server เก็บ idempotencyKeyHash และคืนผลเดิมเมื่อ retry ด้วย key เดิม

server เก็บ idempotencyPayloadHash จาก qrCodeId, visitId และ canonical payload

ถ้า key เดิมมากับ payload hash เดิมให้คืน response เดิม

ถ้า key เดิมมากับ QR, visit หรือ payload คนละชุดให้ตอบ 409 และไม่สร้างข้อมูลใหม่

EMPLOYEE STANDARD submit transaction ต้องตรวจ Visit.disposition เป็น OPEN, formExpiresAt ยังไม่ผ่าน, targetConfirmation เป็น YES, QR ยัง active, QR.version ตรงกับ token, User เป้าหมายยัง active และสถานีที่ใช้ประกอบคำตอบผ่าน `isEmployeeFeedbackStationEligible` ภายใน transaction เดียวกับการ insert Response

STATION STANDARD submit transaction ต้องตรวจ Visit.disposition เป็น OPEN, formExpiresAt ยังไม่ผ่าน, targetConfirmation เป็น YES, QR ยัง active, QR.version ตรงกับ token และสถานีผ่าน `isStationFeedbackEnabled` ภายใน transaction เดียวกับการ insert Response

INCIDENT submit ต้องตรวจ INCIDENT Visit.disposition เป็น OPEN และ formExpiresAt ยังไม่ผ่าน แต่ห้ามปฏิเสธเหตุเพียงเพราะ QR ถูก rotate หรือเป้าหมายถูกปิดหลังเริ่มแจ้ง

ใช้ conditional transition OPEN ไป SUBMITTED ที่ทำให้มีผู้ส่งชนะได้หนึ่ง request และตรวจจำนวนแถวที่อัปเดต

TARGET_REJECTED, SWITCHED_TO_INCIDENT, ABANDONED, BOT_BLOCKED, EXPIRED และ SUBMITTED เป็น terminal state สำหรับ Visit เดิม

server ตรวจ idempotency result เดิมก่อน state transition เพื่อให้ retry ของ request ที่สำเร็จแล้วได้ response เดิม

unique visitId และ idempotencyKeyHash เป็นด่านฐานข้อมูลสำหรับ double tap และ concurrent retry

rotate transaction และ submit transaction ต้อง lock หรือ conflict ที่ QR row เดียวกันเพื่อไม่ให้ version เก่าผ่านหลัง rotate commit

คำตอบที่ผ่าน schema, form token, rate rule และได้ abuse score ต่ำกว่าเกณฑ์เริ่มเป็น VALID

คำตอบที่ abuse score ถึงเกณฑ์เริ่มเป็น SUSPECTED

Response validity เป็น TEST เมื่อ Visit.isTestAtOpen เป็น true โดยไม่อ่านค่า QR ปัจจุบันซ้ำ

isTestAtOpen และ Response validity ห้ามแก้ย้อนหลัง

QR ที่มี Visit แล้วห้ามสลับ isTest และต้องสร้าง QR ทดสอบหรือ production แยก

HIDDEN เกิดจากการกลั่นกรองพร้อมเหตุผลและ AuditLog เท่านั้น

## 16. ป้องกันการส่งซ้ำและการปั่นคะแนน

rate limit เดิมเป็น memory และไม่เพียงพอสำหรับ production serverless

เพิ่ม persistent limiter หรือกติกา dedupe ในฐานข้อมูลก่อนนำคะแนนไปผูกกับ Performance

ระบบใช้สัญญาณหลายอย่างและไม่ตัดสินจาก IP อย่างเดียว

ห้ามบล็อกลูกค้าทั้งสถานีจาก IP เดียวเพราะลูกค้าอาจใช้ Wi-Fi ร่วมกัน

สัญญาณเริ่มต้นมีรายการต่อไปนี้

- visit token ถูกใช้ส่งซ้ำ
- networkHashDaily หรือ clientHashWeekly เดิมส่ง QR เดิมหลายครั้งในช่วงสั้น
- เวลากรอกต่ำกว่า 3 วินาที
- payload และข้อความเหมือนกันหลายครั้ง
- คำตอบจำนวนมากเกิดเป็นช่วงพุ่งผิดปกติ
- session ที่รู้ตัวตนว่าเป็นพนักงานประเมิน QR ของตนเอง
- request ไม่มี signed token หรือ token หมดอายุ

คำตอบเสี่ยงเริ่มที่ SUSPECTED และไม่ถูกลบอัตโนมัติ

ผู้กลั่นกรองยืนยัน VALID หรือซ่อน HIDDEN ได้พร้อมเหตุผล

MVP ไม่ใช้ CAPTCHA และใช้ cooldown, idempotency, risk flag กับตัวตัดวงจรตามกติกาข้างต้น

ระบบเก็บ IP เป็น HMAC ที่หมุน salt และไม่เก็บ IP ดิบ

เพิ่ม CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY ใน .env.example และ production ต้องไม่มีค่า fallback

public API ต้อง fail closed เมื่อ manual code HMAC key, abuse HMAC key หรือ field encryption key ไม่มีค่า

ทุก server instance derive daily key ด้วย HMAC(rootKey, "network:" + วันที่ Asia/Bangkok) และ weekly key ด้วย HMAC(rootKey, "client:" + ISO week ของ Asia/Bangkok)

networkHashDaily ใช้ IP จาก header ที่ deployment platform รับรองแล้วและห้ามเชื่อ X-Forwarded-For จาก client โดยตรง

clientHashWeekly ใช้ IP ที่ normalize แล้วรวมกับ browser family, OS family และ device class แบบหยาบ

resolveNonceHash ใช้ weekly key กับ clientNonce และใช้เป็นตัวช่วย cooldown ที่ผู้ใช้ล้างได้จึงห้ามถือเป็นหลักฐานตัวตน

ระบบสร้าง hash ในหน่วยความจำและห้ามเก็บ IP หรือ user-agent ดิบลงฐานข้อมูล

network hash เปลี่ยน secret ทุกวันและล้างภายใน 48 ชั่วโมง

client hash เปลี่ยน secret ทุกสัปดาห์และล้างภายใน 14 วัน

การบล็อกการประเมินตนเองทำได้แบบ best effort เพราะลูกค้าส่งแบบไม่ login

ระบบต้องพึ่ง minimum sample, rate limit และ moderation เพิ่มเติมและห้ามรับรองว่าป้องกันการประเมินตนเองได้ทั้งหมด

ระบบ escape ข้อความทุกครั้งที่แสดง

ระบบห้าม render comment ด้วย dangerouslySetInnerHTML

## 17. ความเป็นส่วนตัวและการเก็บข้อมูล

แบบประเมินปกติไม่ถามเพศ อายุ เชื้อชาติ เลขทะเบียน หรือข้อมูลที่ไม่จำเป็น

หน้าเปิดแบบประเมินบอกวัตถุประสงค์ ระยะเวลา และลิงก์ประกาศความเป็นส่วนตัว

ข้อมูลติดต่อเป็นทางเลือกและใช้เฉพาะการติดต่อกลับ

เจ้าของระบบต้องยืนยันฐานการประมวลผลและข้อความประกาศกับผู้รับผิดชอบ PDPA ก่อน production

ระบบแยกข้อมูลติดต่อออกจากคะแนนทั่วไป

ค่า retention เริ่มต้นเป็นข้อเสนอและต้องยืนยันก่อนเปิดใช้งานจริง

| ข้อมูล | ค่าเริ่มต้นที่เสนอ |
|---|---|
| networkHashDaily | ล้างภายใน 48 ชั่วโมง |
| clientHashWeekly | ล้างภายใน 14 วัน |
| resolveNonceHash | ล้างภายใน 14 วัน |
| Visit ที่ไม่มีข้อมูลติดต่อ | ลบภายใน 90 วันหลังทำ aggregate |
| ข้อมูลติดต่อ | ลบ 30 วันหลังปิดเคสและไม่เกิน 120 วัน |
| ข้อความดิบ | ตั้ง Response.comment และ Answer.textValue ของคำถามข้อความเป็น null เมื่อครบ 12 เดือนและไม่มีเคสที่ยังเปิด |
| Response และ Answer รายรายการ | ลบเมื่อครบ 24 เดือนหลังสร้าง aggregate และ ReviewSnapshot ที่จำเป็น |
| Response ที่มีเคส | ห้ามลบขณะเคส OPEN หรือ IN_PROGRESS และหลัง RESOLVED หรือ DISMISSED ให้ลบเมื่อครบ 24 เดือนจากคำตอบหรือ 12 เดือนจากวันปิดโดยใช้วันที่ที่ช้ากว่า |
| คำขอทบทวนของพนักงาน | ลบ 24 เดือนหลัง RESOLVED หรือ DISMISSED |
| Aggregate ที่ไม่ระบุตัว | ทบทวนความจำเป็นทุกปี |

cleanup job ต้องรันซ้ำได้และมีรายงานจำนวนที่ลบ

maintenance job ต้อง aggregate และ reconcile สำเร็จก่อนลบ Visit, Response หรือ Answer

เมื่อลบ Response ต้องลบ Contact, Answer และ Case ตามกติกา relation ที่กำหนดและบันทึกจำนวนที่ลบโดยไม่เก็บเนื้อหาเดิม

ถ้าต้องเก็บเคสนานกว่าค่าเริ่มต้นต้องให้ผู้รับผิดชอบ PDPA ระบุเหตุผลและวันหมดอายุ

ข้อมูลติดต่อที่หมด retention ต้องลบจริงและไม่เหลือใน export

ห้ามส่ง comment หรือข้อมูลติดต่อไปบริการ AI ภายนอกก่อนอนุมัติผู้ให้บริการและนโยบายข้อมูล

ถ้าเพิ่ม AI จัดหมวดข้อความให้เก็บ derived tag, modelVersion และ confidence แยกจากข้อความจริง

## 18. แผนข้อมูลและตัวชี้วัด

### 18.1 คำจำกัดความ

valid response สำหรับ KPI คะแนนคือ kind เป็น STANDARD, overallRating มีค่า และ validity เป็น VALID

incident response ใช้สร้างเคสและไม่เข้า KPI คะแนน

suspected response ไม่รวมใน KPI หลักจนกว่าจะผ่านการตรวจ

positive response คือ overallRating เท่ากับ 4 หรือ 5

negative response คือ overallRating เท่ากับ 1 หรือ 2

critical response คือคำตอบที่สร้างเคส URGENT

completed visit คือ visit ที่มี response ส่งสำเร็จหนึ่งรายการ

eligible standard visit คือ STANDARD Visit ที่ isTestAtOpen เป็น false, disposition ไม่เป็น BOT_BLOCKED หรือ SWITCHED_TO_INCIDENT และเป็น Visit ที่ส่งแล้วหรือพ้น formExpiresAt ณ เวลาตัดรายงาน

eligible incident visit คือ INCIDENT Visit ที่ isTestAtOpen เป็น false, disposition ไม่เป็น BOT_BLOCKED และเป็น Visit ที่ส่งแล้วหรือพ้น formExpiresAt ณ เวลาตัดรายงาน

Visit ที่ยัง OPEN และยังไม่พ้น formExpiresAt ต้องตัดออกจากตัวหาร completion เพื่อไม่ให้ผู้ที่กำลังกรอกถูกนับเป็น drop-off

invalid, inactive และ rate-limited resolve ที่ไม่สร้าง Visit แสดงแยกและไม่อยู่ในตัวหาร scan-to-submit

INCIDENT child visit ไม่ถูกนับเพิ่มในตัวหาร STANDARD scan-to-submit

### 18.2 KPI หลัก

| KPI | สูตร | ใช้ตัดสินใจอะไร |
|---|---|---|
| Average overall rating | ผลรวม overallRating ของ valid response หารจำนวน valid response | แนวโน้มคุณภาพรวม |
| Positive rate | valid response คะแนน 4–5 หาร valid response ทั้งหมด | สัดส่วนประสบการณ์ที่ดี |
| Negative rate | valid response คะแนน 1–2 หาร valid response ทั้งหมด | จุดที่ต้องตรวจ |
| Case SLA rate | เคสที่ acknowledgedAt ไม่เกิน dueAt หารเคสที่รับทราบแล้วหรือถึง dueAt ณ เวลาตัดรายงาน | ความเร็วในการแก้ปัญหา |
| Scan-to-submit rate | STANDARD Visit ที่ SUBMITTED หาร eligible standard visit | ประสิทธิภาพ QR และฟอร์ม |
| Incident completion rate | eligible incident visit ที่ SUBMITTED หาร eligible incident visit ทั้งหมด | ตรวจว่า flow เหตุเร่งด่วนส่งสำเร็จหรือหลุดกลางทาง |
| Employee response coverage | พนักงาน active ที่มี valid response ถึง minimum sample หารพนักงาน active ที่มี active primary EMPLOYEE QR | ความทั่วถึงของข้อมูลในกลุ่มที่เปิดใช้งานจริง |

### 18.3 ตัวชี้วัดช่วยวิเคราะห์

แสดงจำนวนและสัดส่วน reason key

แยก reason key ที่เป็น employee, system และ station

แสดงคะแนนและจำนวนคำตอบตาม station, employee, service area, placement, language และช่วงเวลา

แสดง median duration และ drop-off step

แสดง switched-to-incident rate แยกจาก form abandonment

แสดง suspected rate และ duplicate rate

แสดง open case, overdue case และ resolution time

### 18.4 Guardrail

ทุกกราฟต้องแสดง sample size

ห้ามแสดงคะแนนรายคนเมื่อ valid response ต่ำกว่า 10

การเปรียบเทียบสถานีต้องมีอย่างน้อย 20 valid responses ต่อช่วง

คะแนนพนักงานใช้ข้อมูลจาก QR พนักงานเท่านั้น

คะแนนสถานีใช้ข้อมูลจาก QR สถานีเท่านั้น

ห้ามนำคำตอบจาก QR พนักงานมารวมเป็นคะแนนสถานีเพราะพนักงานแต่ละคนถูกสแกนไม่เท่ากัน

ห้ามเปรียบเทียบช่วงเวลาที่จำนวนคำตอบต่างกันมากโดยไม่มีคำเตือน

ห้ามใช้ค่าเฉลี่ยเพียงค่าเดียวและต้องแสดง distribution 1–5

ห้ามรวม suspected, hidden และ test response ใน KPI หลัก

จำนวนครั้งที่พนักงานถูกสแกนใช้วัด coverage ของป้ายและห้ามใช้เป็นคะแนนผลงาน

coverage ต่ำให้ตรวจตำแหน่งป้าย ตารางทำงาน และโอกาสถูกสแกนก่อนสรุปเรื่องพนักงาน

Dashboard ต้องบอกว่าแบบประเมิน QR เป็นข้อมูลจากลูกค้าที่เลือกตอบและไม่แทนลูกค้าทุกคน

ห้ามตั้งเป้าคะแนนธุรกิจก่อนมีข้อมูล pilot

หลัง pilot 30 วันให้ใช้ baseline แยกสถานีและกำหนด target รอบถัดไป

### 18.5 ชั้นข้อมูลสำหรับรายงาน

สร้าง customer_feedback_response_fact_v1 เป็นหนึ่งแถวต่อ valid response

สร้าง customer_feedback_reason_fact_v1 เป็นหนึ่งแถวต่อ reason key ที่ถูกเลือก

รายงาน reason แบบรายรายการใช้ Response ภายใน 24 เดือนและช่วงที่เก่ากว่าใช้ CustomerFeedbackDailyReasonAggregate

สร้าง customer_feedback_scan_funnel_daily_v1 เป็นยอด opened, started, submitted, blocked และ expired รายวัน

ชั้นข้อมูล Dashboard ต้องตัด token, networkHashDaily, clientHashWeekly, contact และข้อความดิบออก

Dashboard, chart และ export ต้องใช้คำจำกัดความและ filter ชุดเดียวกัน

ข้อมูลย้อนหลังใช้ station, department และ shift snapshot ตอนส่ง

ห้าม join ต้นสังกัดปัจจุบันแล้วเปลี่ยนประวัติย้อนหลัง

### 18.6 กฎแจ้งเตือน

กฎทุกข้อใช้ CustomerFeedbackAlertLog ป้องกันการส่งซ้ำ

แจ้ง QR ที่สร้างแล้วแต่ไม่เคย resolve สำเร็จภายใน 7 วัน

แจ้ง PUBLIC_SUBMIT ที่ outcome เป็น SERVER_ERROR เกิน 2 เปอร์เซ็นต์ของ SUCCESS บวก SERVER_ERROR ใน 15 นาทีเมื่อมีอย่างน้อย 20 requests

ไม่นับ validation 4xx, duplicate 409 หรือ rate limit 429 เป็น server submit error

แจ้ง suspected rate เกิน 20 เปอร์เซ็นต์ในหนึ่งชั่วโมงเมื่อมีอย่างน้อย 10 responses

แจ้ง STANDARD response ที่เป็น VALID แต่ไม่มี overallRating

แจ้ง required-answer completeness ต่ำกว่า 98 เปอร์เซ็นต์

แจ้ง station context หายเกิน 1 เปอร์เซ็นต์

แจ้ง station positive rate ลดลงอย่างน้อย 15 จุดจากช่วง 28 วันก่อนหน้าเมื่อทั้งสองช่วงมีอย่างน้อย 20 responses

Alert ด้านข้อมูลเป็นสัญญาณให้ตรวจและไม่เปลี่ยนคะแนนหรือสถานะพนักงานอัตโนมัติ

MVP ใช้ Notification ภายในระบบเท่านั้น

การส่ง Discord อยู่นอก MVP เพื่อป้องกันเหตุลูกค้าไหลเข้าช่อง attendance

## 19. การรวมเข้ารอบประเมินพนักงานภายหลัง

Phase แรกแสดง Customer Feedback เป็นหลักฐานแยก

เมื่อปิด ReviewPeriod ให้สร้าง snapshot ของช่วงวันที่เดียวกับรอบประเมิน

snapshot ต้องเก็บคะแนน จำนวนคำตอบ positive rate negative rate และเหตุผลหลัก

snapshot ต้องเก็บจำนวน suspected ที่ถูกตัดออก

ReviewSubmission แสดง link ไปหลักฐานสรุปและไม่คัดลอก comment ดิบทั้งหมด

หัวหน้าต้องเขียน managerReview และยืนยันการใช้หลักฐานด้วยตนเอง

ถ้าภายหลังใช้สูตรรวม ให้เริ่มจากน้ำหนักลูกค้าไม่เกิน 10–15 เปอร์เซ็นต์

สูตรต้องผ่าน calibration ข้ามสถานีและมี minimum sample

คะแนนปัญหาจาก system_wait, system_process และ system_availability ห้ามหักพนักงานตรง ๆ

คะแนนเหตุร้ายแรงที่ยังตรวจไม่จบห้ามใช้ตัดสินพนักงาน

พนักงานต้องมีช่องทางขอให้หัวหน้าตรวจคำตอบที่สงสัยว่าเป็นการกลั่นแกล้ง

## 20. File map สำหรับ AI ตัวถัดไป

### ต้องแก้

- prisma/schema.prisma
- src/components/layout/AppShell.tsx
- src/components/layout/admin-sidebar.tsx
- src/lib/qr-code.ts
- src/lib/employee-removal.ts
- src/lib/notifications.ts
- src/lib/logger.ts
- src/app/admin/stations/page.tsx
- src/app/api/admin/stations/route.ts
- src/app/api/admin/employees/route.ts
- src/app/api/admin/employees/bulk/route.ts
- src/app/api/admin/employees/[id]/route.ts
- src/app/performance/page.tsx
- src/app/admin/performance/page.tsx
- vercel.json
- .env.example

### ต้องเพิ่ม

- prisma/migrations/วันที่_add_customer_feedback/migration.sql
- prisma/seed-customer-feedback-permissions.ts
- src/lib/customer-feedback/questions.ts
- src/lib/customer-feedback/types.ts
- src/lib/customer-feedback/token.ts
- src/lib/customer-feedback/form-token.ts
- src/lib/customer-feedback/feature-flags.ts
- src/lib/customer-feedback/access.ts
- src/lib/customer-feedback/employee-status.ts
- src/lib/customer-feedback/station-context.ts
- src/lib/customer-feedback/validation.ts
- src/lib/customer-feedback/anti-abuse.ts
- src/lib/customer-feedback/metrics.ts
- src/lib/customer-feedback/cases.ts
- src/lib/customer-feedback/alerts.ts
- src/lib/customer-feedback/retention.ts
- src/app/f/page.tsx
- src/app/f/feedback-form.tsx
- src/app/feedback/privacy/page.tsx
- src/app/admin/customer-feedback/page.tsx
- src/components/customer-feedback/public/*
- src/components/customer-feedback/admin/*
- src/components/customer-feedback/self-summary.tsx
- src/app/api/public/customer-feedback/resolve/route.ts
- src/app/api/public/customer-feedback/submissions/route.ts
- src/app/api/public/customer-feedback/incidents/start/route.ts
- src/app/api/public/customer-feedback/incidents/route.ts
- src/app/api/public/customer-feedback/visits/progress/route.ts
- src/app/api/public/customer-feedback/stations/route.ts
- src/app/api/admin/customer-feedback/summary/route.ts
- src/app/api/admin/customer-feedback/responses/route.ts
- src/app/api/admin/customer-feedback/responses/[id]/route.ts
- src/app/api/admin/customer-feedback/responses/[id]/contact/route.ts
- src/app/api/admin/customer-feedback/cases/route.ts
- src/app/api/admin/customer-feedback/cases/[id]/route.ts
- src/app/api/admin/customer-feedback/qr-codes/route.ts
- src/app/api/admin/customer-feedback/qr-codes/[id]/route.ts
- src/app/api/admin/customer-feedback/export/route.ts
- src/app/api/admin/customer-feedback/questions/route.ts
- src/app/api/admin/customer-feedback/review-requests/route.ts
- src/app/api/admin/customer-feedback/review-requests/[id]/route.ts
- src/app/api/admin/performance/periods/[id]/close/route.ts
- src/app/api/customer-feedback/me/route.ts
- src/app/api/customer-feedback/me/review-requests/route.ts
- src/app/api/cron/customer-feedback-maintenance/route.ts
- src/lib/__tests__/customer-feedback-*.test.ts

ไฟล์อาจแยกย่อยเพิ่มได้เมื่อหน้าใหญ่เกินไป

ห้ามสร้าง Client Component ขนาดใหญ่ไฟล์เดียวที่รวมทุกแท็บและทุก modal

## 21. ลำดับพัฒนา

### Phase 0: ยืนยันข้อมูลก่อนเขียน production

- [ ] ยืนยัน APP_BASE_URL ของ production
- [ ] ยืนยันชื่อบริษัทและช่องทางติดต่อใน privacy notice
- [ ] ยืนยันชื่อสาธารณะที่พนักงานอนุญาต
- [ ] ยืนยันตำแหน่งสาธารณะและบันทึกว่าพนักงานรับทราบก่อน activate QR
- [ ] ยืนยันว่าพนักงานกลุ่มใดเป็น customer-facing
- [ ] ยืนยันผู้รับ alert ของแต่ละสถานี
- [ ] ยืนยันหมายเลขฉุกเฉินที่จะแสดง
- [ ] ยืนยัน retention กับผู้รับผิดชอบ PDPA
- [ ] เลือก 1–2 สถานีสำหรับ pilot

ถ้ายังไม่ได้คำตอบ ให้ AI ใช้ค่าเริ่มต้นในหัวข้อ 25 เป็น draft และทำระบบให้แก้ได้

ห้าม activate EMPLOYEE QR ก่อน public profile approval และห้าม activate STATION QR ก่อนมี publicEmergencyPhone

### Phase 1: ฐานข้อมูลและกติกากลาง

- [ ] เพิ่ม enum และ model
- [ ] เพิ่ม Station.publicEmergencyPhone และกติกาห้ามเปิด public feedback เมื่อไม่มีหมายเลข
- [ ] เพิ่ม Notification.eventKey และ unique index แบบ nullable โดยไม่กระทบ Notification เดิม
- [ ] เพิ่มช่องแก้ publicEmergencyPhone ในหน้าและ API จัดการสถานี
- [ ] เพิ่ม SQL check constraint และ partial unique index
- [ ] สร้าง migration ที่ปลอดภัยกับข้อมูล production
- [ ] เพิ่ม additive permission seed
- [ ] เพิ่ม question registry employee-v1, station-v1 และ incident-v1
- [ ] เพิ่ม shared validation และ unit test
- [ ] เพิ่ม access helper ที่อ่าน role, isActive และ stationId ปัจจุบันจากฐานข้อมูลทุก request
- [ ] เพิ่ม employee status helper และย้าย route ปิดพนักงานรายคนกับแบบกลุ่มมาใช้ helper เดียวกัน
- [ ] เพิ่ม token, canonical URL และ form token
- [ ] เพิ่ม helper แยก `isStationFeedbackEnabled` กับ `isEmployeeFeedbackStationEligible` และใช้ร่วมกันทุก API ที่เกี่ยวข้อง
- [ ] เพิ่ม metric และ case severity pure functions
- [ ] เพิ่ม cleanup rule
- [ ] เพิ่ม visit daily aggregate, resolve daily aggregate, reason daily aggregate และ review snapshot
- [ ] เพิ่ม persistent rate bucket และ alert log
- [ ] เพิ่ม feature flag helper จาก environment และ gate หน้า public กับ API

### Phase 2: Public form และ QR

- [ ] สร้าง /f แบบ no-shell อ่าน fragment และรองรับรหัสกรอกเอง
- [ ] สร้าง resolve POST และลบ fragment จาก address bar หลัง resolve
- [ ] สร้าง employee flow
- [ ] สร้าง station flow
- [ ] สร้าง urgent incident flow แบบไม่มีไฟล์แนบ
- [ ] สร้าง child INCIDENT Visit และ token แยกเมื่อผู้ใช้สลับจากแบบปกติ
- [ ] รักษาร่าง STANDARD และคง parent เป็น OPEN จนกว่า child incident จะส่งสำเร็จ
- [ ] รองรับไทยและอังกฤษ
- [ ] เก็บร่างและ retry
- [ ] บันทึก Visit และ Response
- [ ] ใส่ anti-abuse และ persistent rate limit
- [ ] ใส่ Cache-Control, Referrer-Policy และห้าม third-party script
- [ ] สร้างหน้า privacy
- [ ] สร้าง admin QR list, generate, rotate, download และ print
- [ ] ทดสอบ canonical production URL

### Phase 3: Dashboard และ Case

- [ ] สร้าง Overview พร้อม filter
- [ ] สร้าง Responses พร้อม moderation
- [ ] สร้าง Case queue และ SLA
- [ ] จำกัด MANAGER ตาม station
- [ ] แยก endpoint ข้อมูลติดต่อ
- [ ] เพิ่ม notification
- [ ] เพิ่ม NotificationType สำหรับ CUSTOMER_FEEDBACK
- [ ] สร้าง eventKey ต่อ case, recipient และ event type พร้อมทดสอบ retry ไม่ให้เกิด Notification ซ้ำ
- [ ] เพิ่ม export ที่ตัดข้อมูลติดต่อ
- [ ] เพิ่ม audit log
- [ ] เพิ่ม cron maintenance ใน vercel.json ที่ 15 18 * * * ซึ่งเท่ากับประมาณ 01:15 Asia/Bangkok พร้อมตรวจ CRON_SECRET

### Phase 4: Pilot และ Performance evidence

- [ ] เปิด pilot 1–2 สถานี
- [ ] ทดสอบกับลูกค้าจริงหลายช่วงอายุ
- [ ] วัดเวลา completion และ drop-off
- [ ] ตรวจคำถามที่ตีความไม่ตรง
- [ ] ตรวจ suspected pattern และ false positive
- [ ] ปรับถ้อยคำด้วย survey version ใหม่เมื่อจำเป็น
- [ ] กำหนด baseline หลัง 30 วัน
- [ ] สร้าง evidence snapshot สำหรับ ReviewPeriod
- [ ] เพิ่มปุ่มปิด ReviewPeriod และ transaction ปิดรอบพร้อม snapshot
- [ ] เพิ่ม self-summary ในหน้า Performance และบังคับ user จาก session
- [ ] เพิ่มแบบส่งคำขอทบทวนของพนักงานและคิวให้ ADMIN หรือ HR ปิดงาน
- [ ] ห้ามเปิดสูตรโบนัสจนผ่านการอนุมัติ

## 22. Test plan

### Unit test

- [ ] token มี entropy และรูปแบบที่กำหนด
- [ ] manual code ใช้ HMAC และตัวอักษรที่ไม่สับสน
- [ ] abuse hash ได้ค่าเดียวกันข้าม server instance ในวันหรือสัปดาห์เดียวกันและเปลี่ยนเมื่อข้ามช่วง
- [ ] canonical URL ไม่ใช้ localhost ใน production
- [ ] question key ไม่ซ้ำและ version เดิมไม่ถูกแก้
- [ ] validator รับเฉพาะคะแนน 1–5
- [ ] คะแนน 1–2 บังคับสาเหตุ
- [ ] branching ใช้ชุดคำถามถูกต้อง
- [ ] reason key แยก employee, system และ station ถูกต้อง
- [ ] case severity และ dueAt ถูกต้อง
- [ ] predicate ของ Employee feedback รับสถานี active ที่ยังไม่มี Station QR และ predicate ของ Station feedback บังคับหมายเลขฉุกเฉินกับ primary QR
- [ ] URGENT Response ไม่มีทาง commit โดยไม่มี Case, AlertLog และ Notification fallback
- [ ] aggregate ตัด SUSPECTED, HIDDEN และ TEST
- [ ] minimum sample ทำงาน
- [ ] contact retention และ purgeAfter ถูกต้อง
- [ ] token rotation ทำให้ token เดิมใช้ไม่ได้
- [ ] validity เริ่มเป็น VALID, SUSPECTED หรือ TEST และเปลี่ยนเป็น HIDDEN ตามกติกา
- [ ] normalized answer แยก ANSWERED, SKIPPED และ NOT_SHOWN ถูกต้อง
- [ ] daily aggregate reconcile แล้วจึงลบ Visit
- [ ] reason daily aggregate reconcile แล้วจึงลบ Response และ Answer
- [ ] operational metric bucket นับ success กับ server error ถูกต้องโดยไม่เก็บข้อมูลระบุตัว

### API test

- [ ] public page เปิดได้โดยไม่ login
- [ ] token ผิดคืนข้อความกลางและไม่เผยข้อมูล
- [ ] target inactive ส่งคะแนนไม่ได้
- [ ] station search คืนข้อมูลขั้นต่ำและใช้ filter ตามชนิด Visit
- [ ] STANDARD และ child INCIDENT token ถูกผูกกับ QR, QR version, visit kind และ survey version
- [ ] standalone INCIDENT token ใช้ targetType UNKNOWN และไม่มี QR id หรือ version ได้เฉพาะ flow นี้
- [ ] form ที่เปิดก่อน rotate ส่งไม่ได้และได้รับข้อความให้สแกนใหม่
- [ ] visit ส่ง response ได้ครั้งเดียว
- [ ] Visit ที่ไม่เป็น OPEN หรือพ้น formExpiresAt ส่งคำตอบใหม่ไม่ได้
- [ ] token ของ employee-v1 หรือ station-v1 ส่ง incident-v1 ไม่ได้
- [ ] incidents/start สร้าง child Visit ได้หนึ่งรายการและ retry คืน child เดิม
- [ ] incidents/start ไม่ปิด parent และลูกค้ากลับไปทำร่างเดิมต่อได้
- [ ] child incident ที่ส่งสำเร็จเปลี่ยน parent ที่ยัง OPEN เป็น SWITCHED_TO_INCIDENT ใน transaction เดียวกัน
- [ ] Idempotency-Key เดิมคืนผลเดิมและไม่สร้างแถวเพิ่ม
- [ ] Idempotency-Key เดิมกับ payload คนละชุดคืน 409
- [ ] concurrent double submit มี Response เดียว
- [ ] rotate ชน STANDARD submit แล้ว version เก่าบันทึกไม่ได้หลัง rotate commit
- [ ] payload เกินขนาดถูกปฏิเสธ
- [ ] payload ที่พยายามกำหนด employeeId, qrCodeId, validity, abuse หรือ timestamp ถูกปฏิเสธ
- [ ] wantsFollowUp และ Contact ตรงกันทั้งสองทางและ consentAt มาจาก server
- [ ] comment แสดงเป็น plain text
- [ ] session พนักงานที่ตรวจพบถูกบล็อกเมื่อประเมิน QR ของตนเอง
- [ ] self-summary บังคับ employeeId จาก session และไม่รับ id จาก client
- [ ] ปิด ReviewPeriod สำเร็จพร้อม snapshot หรือ rollback ทั้งชุดเมื่อสร้าง snapshot ล้มเหลว
- [ ] พนักงานส่งและอ่านคำขอทบทวนได้เฉพาะของตนเอง
- [ ] MANAGER อ่านข้อมูลข้าม station ไม่ได้
- [ ] MANAGER ที่ไม่มี stationId ได้ 403
- [ ] MANAGER ที่ย้ายสถานีแล้วใช้ scope จากฐานข้อมูลล่าสุดแม้ JWT ยังมี stationId เดิม
- [ ] ผู้ไม่มี permission เปิด contact ไม่ได้
- [ ] ผู้ไม่มี view_incident ไม่เห็น incident row, count, field หรือ comment ใน list, detail, summary และ export
- [ ] การเปิด contact สร้าง AuditLog
- [ ] การเปิด contact ตอบ 500 และไม่คืนข้อมูลเมื่อเขียน AuditLog ล้มเหลว
- [ ] rotate และ moderation สร้าง AuditLog
- [ ] export ไม่มีข้อมูลติดต่อและป้องกัน formula injection
- [ ] public response มี Cache-Control no-store และ Referrer-Policy no-referrer
- [ ] station และ shift snapshot ไม่เปลี่ยนเมื่อย้ายพนักงานภายหลัง
- [ ] selectedStationId สร้าง stationIdSelected และ CUSTOMER_SELECTED ใน transaction เดียวกัน
- [ ] Employee QR ที่สถานี active แต่ยังไม่มี Station QR ส่งคำตอบได้
- [ ] Station QR ส่งคำตอบได้เฉพาะสถานีที่ผ่าน `isStationFeedbackEnabled`
- [ ] incident เก็บประเภทเหตุ สถานะอันตราย เวลาเกิดเหตุ และ noDetail ครบ
- [ ] incident ที่ไม่มี comment และไม่ได้เลือก noDetail ถูกปฏิเสธ
- [ ] resolve manual code ถูก rate limit และไม่บอกว่ารหัสมีอยู่หรือถูกปิด
- [ ] Resolve-Idempotency-Key เดิมคืน Visit เดิมและไม่เพิ่ม openedCount ซ้ำ
- [ ] maintenance cron ปฏิเสธ request ที่ไม่มี CRON_SECRET
- [ ] feature flag ปิดแล้วหน้าและ API ที่เกี่ยวข้องหยุดรับงานแบบ fail closed

### UI และ accessibility

- [ ] ใช้งานที่ 320, 375, 390, 430 และ 768 พิกเซล
- [ ] keyboard ทำทุกขั้นตอนได้
- [ ] screen reader อ่านคำถาม กลุ่มตัวเลือก error และ success ได้
- [ ] ขยายข้อความ 200 เปอร์เซ็นต์แล้วไม่เสียข้อมูล
- [ ] พื้นที่แตะของปุ่มและตัวเลือกอย่างน้อย 44 คูณ 44 CSS pixels
- [ ] ข้อความปกติมี contrast อย่างน้อย 4.5 ต่อ 1
- [ ] ไม่มีคำตอบที่ถูกเลือกไว้ล่วงหน้า
- [ ] การเลือกคะแนนไม่เปลี่ยนหน้าเอง
- [ ] error เก็บคำตอบเดิม
- [ ] network retry ส่งคำตอบเดิมได้ครั้งเดียว
- [ ] public page ไม่มี bottom navigation หรือ employee modal
- [ ] reduced motion ทำงาน

### Field test

- [ ] QR ป้ายพนักงานสแกนจากงานพิมพ์จริง
- [ ] QR A5 และ A4 สแกนได้ในแสงจริงของสถานี
- [ ] หน้า /f และรหัสกรอกเองใต้ป้ายเปิดแบบประเมินเป้าหมายเดียวกับ QR
- [ ] QR ทุกแผ่นชี้ production domain
- [ ] token อยู่ใน URL fragment และถูกลบจาก address bar หลัง resolve
- [ ] ลูกค้าปกติทำแบบประเมินจบภายในประมาณ 60 วินาที
- [ ] ผู้สูงอายุและผู้ไม่ถนัดเทคโนโลยีใช้งานจบได้
- [ ] อินเทอร์เน็ตช้าไม่ทำคำตอบหาย

## 23. Acceptance criteria

- [ ] QR ลงเวลาเดิมทำงานเหมือนเดิมทุกกรณี
- [ ] ลูกค้าประเมินพนักงานและสถานีได้โดยไม่ login
- [ ] QR พนักงานทุกคนใช้ token แยกและไม่เผย employeeId
- [ ] QR พนักงานที่ยังไม่อนุมัติ publicLabel และ publicPosition เปิดใช้งานไม่ได้
- [ ] การปิดพนักงานผ่าน route รายคน, DELETE แบบกลุ่ม และ bulk change-status ปิด EMPLOYEE QR ใน transaction เดียวกันทุกทาง
- [ ] QR สถานีใช้ token แยกจาก Station.qrCode
- [ ] การตอบ “ไม่ใช่” หรือ “ไม่แน่ใจ” ไม่สร้างคะแนน
- [ ] คะแนน 1–2 มีสาเหตุหรือ unspecified
- [ ] STANDARD ที่ไม่มีคะแนนถูกปฏิเสธและ INCIDENT ส่งได้โดยไม่มีคะแนน
- [ ] unspecified และ unsure ยกเลิกคำตอบอื่นและส่งร่วมกับค่าอื่นไม่ได้
- [ ] ลูกค้าแจ้งเหตุเร่งด่วนได้จากทุกหน้า
- [ ] ทุกสถานีที่เปิดใช้ public feedback มีปุ่มโทรหมายเลขฉุกเฉิน
- [ ] ข้อมูลติดต่อไม่ออกใน API และ export ปกติ
- [ ] ผู้จัดการเห็นเฉพาะสถานีที่รับผิดชอบ
- [ ] ผู้จัดการที่ไม่มีสถานีไม่ได้รับข้อมูลใดและได้ 403
- [ ] Dashboard แสดง sample size และ distribution
- [ ] คะแนนรายคนซ่อนเมื่อ valid response ต่ำกว่า 10
- [ ] suspected response ไม่รวม KPI หลัก
- [ ] คะแนนพนักงานและสถานีใช้แหล่ง QR คนละชุด
- [ ] ไม่มีการเขียนคะแนนลูกค้าเข้า payroll หรือโบนัส
- [ ] พนักงานมีช่องทางขอทบทวนผลโดยไม่เห็น comment ดิบหรือข้อมูลผู้ตอบ
- [ ] hard delete พนักงานถูกปฏิเสธเมื่อมีคำขอทบทวน OPEN หรือ IN_REVIEW และคำขอที่ปิดแล้วรักษา label snapshot หลัง SetNull
- [ ] QR ที่พิมพ์ใช้ production domain
- [ ] ระบบเก็บคำตอบเมื่อ network error
- [ ] แบบประเมินปกติจบได้ภายในประมาณ 60 วินาทีในการ field test
- [ ] หน้าสาธารณะใช้ได้ตั้งแต่ความกว้าง 320 พิกเซลโดยไม่มีการเลื่อนด้านข้าง
- [ ] ทุกขั้นทำด้วย keyboard และโปรแกรมอ่านหน้าจออ่าน label, error และ success ได้
- [ ] ขยายข้อความ 200 เปอร์เซ็นต์แล้วข้อมูลและปุ่มยังใช้งานได้
- [ ] ปุ่มและตัวเลือกมีพื้นที่แตะอย่างน้อย 44 คูณ 44 CSS pixels
- [ ] ข้อความปกติมี contrast อย่างน้อย 4.5 ต่อ 1
- [ ] focus ไปยังคำถามหรือ error ที่เกี่ยวข้องและ reduced motion ทำงาน
- [ ] ทุกการ rotate, moderate, เปิด contact และปิดเคสมี AuditLog
- [ ] retry และ double tap ไม่สร้างคำตอบซ้ำ
- [ ] token, manual code, signed visit token, IP, contact และ comment ไม่หลุดใน application log
- [ ] aggregate ถูกสร้างและ reconcile ก่อนลบข้อมูลรายละเอียดตาม retention
- [ ] retention job ล้างข้อมูลทดสอบได้ครบ
- [ ] test, lint และ build ผ่าน
- [ ] migration production มีแผน rollback

## 24. Rollout และ rollback

เพิ่ม environment flag CUSTOMER_FEEDBACK_ENABLED สำหรับหน้า admin, dashboard และ API ภายใน

เพิ่ม environment flag CUSTOMER_FEEDBACK_PUBLIC_ENABLED สำหรับหน้า /f และ public API

src/lib/customer-feedback/feature-flags.ts อ่านค่าแบบ fail closed และใช้ร่วมกันทั้ง server page กับ route handler

เปิด admin ให้ ADMIN และ HR ทดสอบก่อน

สร้าง QR ที่ isTest เป็น true และบังคับให้ Visit snapshot ค่านี้แล้วสร้าง Response เป็น TEST

เปิด public เฉพาะ 1–2 สถานีใน pilot

ติดป้ายจำนวนจำกัดและบันทึกจุดติดตั้ง

ตรวจ submission error, suspected rate และ urgent alert ทุกวันในสัปดาห์แรก

ถ้าต้องหยุดรับคำตอบให้ปิด CUSTOMER_FEEDBACK_PUBLIC_ENABLED โดยไม่ลบข้อมูล

rollback code ต้องไม่ drop table ที่มีคำตอบ

rollback migration ใช้การหยุดอ่าน model ใหม่และเก็บข้อมูลไว้

เมื่อหมุน token ผิดต้องสร้างป้ายใหม่และห้ามนำ token เก่ากลับมาใช้

## 25. ค่าเริ่มต้นเมื่อเจ้าของระบบยังไม่ตอบ

| เรื่อง | ค่าเริ่มต้น |
|---|---|
| ชื่อ public พนักงาน | เสนอ nickName หรือชื่อจริงส่วนแรกเป็น draft และ block activation จนพนักงานรับทราบ |
| ตำแหน่ง public | เสนอ “พนักงานบริการ” เป็น draft และ block activation จนพนักงานรับทราบ |
| รูป public | ไม่แสดง |
| ภาษา | ไทยและอังกฤษ |
| QR พนักงาน | หนึ่ง QR ต่อพนักงาน |
| QR สถานี | หนึ่ง QR หลักต่อสถานี |
| คะแนนที่สร้างเคส | 1–2 |
| minimum sample รายคน | 10 valid responses |
| คะแนนเข้ารอบ Performance | แสดงเป็น evidence เท่านั้น |
| โบนัสหรือบทลงโทษ | ปิด |
| ไฟล์แนบเหตุเร่งด่วน | ปิด |
| ข้อมูลติดต่อ | ไม่บังคับและเข้ารหัส |
| retention | ใช้ค่าที่เสนอในหัวข้อ 17 จนกว่าจะยืนยัน |
| pilot | 1–2 สถานีเป็นเวลา 30 วัน |

## 26. งานที่ยังไม่รวมใน MVP

หน้าสร้างแบบสอบถามแบบ drag-and-drop

การแนบรูป วิดีโอ หรือเสียงจากลูกค้า

AI สรุป sentiment หรือสร้างบทลงโทษ

การส่งของรางวัลให้ลูกค้า

การให้ลูกค้าเข้าสู่ระบบ

การเลือกพนักงานจากรายชื่อใน Station QR

การจัดอันดับพนักงานแบบสาธารณะ

การคิดโบนัสอัตโนมัติ

การส่งข้อมูลไป CRM ภายนอก

## 27. Prompt ส่งต่อให้ AI ตัวอื่น

ให้อ่านเอกสารนี้ทั้งไฟล์ก่อนแก้โค้ด

ให้ตรวจ git status และอ่านไฟล์ปัจจุบันที่ระบุในหัวข้อ 2 และ 20

ให้ทำงานใน repo timetrack ซึ่งเป็น Git repo จริง

ให้รักษา Station.qrCode และ flow ลงเวลาเดิมทุกกรณี

ให้เริ่มจาก Phase 1 และทำ migration, permission, question registry และ test ก่อนหน้า UI

ให้ใช้ component และ design token ของระบบเดิม

ให้ใช้ public route แบบ no-shell และเปิด user zoom

ให้สร้าง QR URL จาก APP_BASE_URL ฝั่ง server

ให้ตรวจ permission และ station scope ใน API

ให้เก็บข้อมูลติดต่อแยกและเข้ารหัส

ให้ใช้ shared validation ฝั่ง client และ server

ให้ทำ public flow, admin QR, Dashboard และ Case ตามลำดับ

ให้รัน test, lint, build และตรวจ migration ก่อนส่งมอบ

ให้สรุปไฟล์ที่แก้ ผลทดสอบ ข้อจำกัด และสิ่งที่ยังไม่เปิดใช้

หากต้องตัด scope ให้รักษา QR แยก, public form, validation, privacy, anti-abuse และ sample guardrail ไว้ก่อนส่วนตกแต่ง

## 28. แหล่งอ้างอิง

### ภายในโปรเจกต์

- prisma/schema.prisma
- src/app/performance/page.tsx
- src/app/admin/performance/page.tsx
- src/app/api/performance/periods/route.ts
- src/app/api/performance/submissions/route.ts
- src/app/admin/qr-codes/page.tsx
- src/app/api/admin/qr-codes/route.ts
- src/lib/qr-code.ts
- src/lib/form-token.ts
- src/lib/rate-limit.ts
- src/lib/permissions.ts
- src/components/layout/AppShell.tsx
- src/components/layout/admin-sidebar.tsx
- src/app/layout.tsx
- docs/hr-system-roadmap.md
- docs/job-application-design.md

### ภายนอก

- Pew Research Center: Writing Survey Questions — https://www.pewresearch.org/writing-survey-questions/
- W3C: Web Content Accessibility Guidelines 2.2 — https://www.w3.org/TR/WCAG22/
- W3C: Target Size Minimum — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C: Forms Tutorial — https://www.w3.org/WAI/tutorials/forms/
- GOV.UK: Form structure — https://www.gov.uk/service-manual/design/form-structure
- GOV.UK Design System: Question pages — https://design-system.service.gov.uk/patterns/question-pages/
- GOV.UK Design System: Radio buttons — https://design-system.service.gov.uk/components/radios/
- GOV.UK Design System: Error messages — https://design-system.service.gov.uk/components/error-message/
- Nottinghamshire County Council: Using QR codes — https://www.nottinghamshire.gov.uk/global-content/how-to-create-accessible-content/qr-codes
- OWASP API4:2023 Unrestricted Resource Consumption — https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/
- OWASP Automated Threats to Web Applications — https://owasp.org/www-project-automated-threats-to-web-applications/
- PDPC GPPC Privacy Notice — https://gppc.pdpc.or.th/wp-content/uploads/GPPC-PDPC_Register_Privacy-Notice-%E0%B8%89%E0%B8%9A%E0%B8%B1%E0%B8%9A%E0%B8%A2%E0%B9%88%E0%B8%AD_05062024.pdf
- ศูนย์รวมข้อมูลเพื่อติดต่อราชการ: หมายเลขฉุกเฉิน 191 และ 1669 — https://info.go.th/emergency-number
