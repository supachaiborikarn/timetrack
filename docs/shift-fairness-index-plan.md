# แผนฟีเจอร์ Shift Fairness Index และระบบช่วยจัดกะจากข้อมูล Fuel Station

## เป้าหมาย

ฟีเจอร์นี้ทำให้ระบบจัดกะดูทั้งความยุติธรรมของพนักงานและความต้องการคนจริงของแต่ละสาขา

ระบบควรตอบได้ว่าใครได้กะหนักเกินไป ใครได้วันหยุดเสียเปรียบ ใครถูกลงกะช่วงพีคบ่อยเกิน และสาขาไหนควรใช้กี่คนในแต่ละช่วงเวลา

ระบบควรจำลองตารางกะก่อนบันทึกจริง และเมื่อผู้จัดการพอใจแล้วจึงค่อยกดบันทึกลง `ShiftAssignment`

## ข้อมูลที่มีอยู่แล้ว

ฝั่ง `timetrack` มีข้อมูลพนักงาน สาขา แผนก กะ ตารางกะ วันว่าง และกะว่างอยู่แล้ว

ตารางหลักที่ใช้ได้ทันทีคือ `User`, `Station`, `Department`, `Shift`, `ShiftAssignment`, `EmployeeAvailability`, `ShiftSwap`, `ShiftPool`, `Attendance`

ฝั่ง `fuel-station` มีข้อมูลแรงงานและยอดขายรายชั่วโมงจาก TimeTrack sync อยู่แล้ว

API ที่ใช้เป็นฐานได้คือ `GET /api/labor-analytics`

ข้อมูลสำคัญจาก `fuel-station` คือ `timetrack_hourly_productivity` ซึ่งมี `station_id`, `business_date`, `hour_block`, `forecourt_workers_count`, `tx_count`, `liters`, `revenue`, `tx_per_worker`

ข้อมูลนี้เหมาะกับการคำนวณว่าชั่วโมงไหนคนไม่พอหรือคนเกิน

## แนวคิดการคำนวณจำนวนคนที่ต้องใช้

ระบบควรเริ่มจากสูตรง่ายและอธิบายได้ก่อน

สูตร MVP คือใช้ `tx_count` เป็นตัวหลัก เพราะจำนวนรายการเติมสะท้อนจำนวนลูกค้าได้ดีกว่ายอดขายหรือจำนวนลิตร

ตัวอย่างสูตร:

`requiredWorkers = ceil(expectedTxCount / targetTxPerWorker)`

`targetTxPerWorker` ควรมาจากค่าเฉลี่ยย้อนหลัง 30-90 วันของแต่ละสาขาและวันในสัปดาห์

ถ้ามี transaction น้อยมาก ให้ใช้ขั้นต่ำของสาขาแทน เช่น หน้าลานอย่างน้อย 2 คน

ถ้าช่วงพีคสูงผิดปกติ ให้ใช้ buffer เช่น เพิ่ม 1 คนเมื่อ workload สูงกว่า P75 หรือ P90 ของสาขานั้น

ระบบควรเก็บผลเป็น requirement รายสาขา รายวัน รายชั่วโมง หรือรายกะ

## ข้อมูลใหม่ที่ควรเพิ่มใน `timetrack`

เพิ่มตาราง `StaffingRequirement`

ฟิลด์หลัก:

- `id`
- `stationId`
- `departmentId`
- `date`
- `hourBlock`
- `shiftId`
- `requiredWorkers`
- `minWorkers`
- `maxWorkers`
- `source`
- `confidence`
- `reason`
- `createdAt`
- `updatedAt`

เพิ่มตาราง `ShiftFairnessSnapshot`

ฟิลด์หลัก:

- `id`
- `stationId`
- `month`
- `year`
- `score`
- `summaryJson`
- `createdAt`

เพิ่มตาราง `ScheduleSimulation`

ฟิลด์หลัก:

- `id`
- `stationId`
- `month`
- `year`
- `status`
- `inputJson`
- `resultJson`
- `createdBy`
- `createdAt`
- `appliedAt`

## Shift Fairness Index ควรวัดอะไร

คะแนนรวมควรอยู่ที่ 0-100

คะแนนสูงแปลว่าตารางกะยุติธรรมและครอบคลุม workload ดี

ตัวชี้วัดหลัก:

- ความสมดุลของจำนวนวันทำงานต่อคน
- ความสมดุลของชั่วโมงทำงานต่อคน
- จำนวนกะหนักต่อคน
- จำนวนกะพีคต่อคน
- จำนวนวันหยุดเสาร์อาทิตย์หรือวันหยุดยอดนิยมต่อคน
- จำนวนวันที่ถูกจัดทั้งที่แจ้ง `UNAVAILABLE`
- จำนวนวันที่ถูกจัดทั้งที่แจ้ง `PREFERRED_OFF`
- จำนวนกะติดกันหนักเกินไป
- จำนวน OT โดยประมาณ
- coverage เทียบกับจำนวนคนที่ระบบคาดว่าต้องใช้

ตัวอย่างสูตรคะแนน:

`fairnessScore = 100 - penalty`

penalty มาจาก:

- ตารางขาดคน: ลบมาก
- จัดคนในวันที่แจ้งหยุดไม่ได้: ลบมาก
- คนหนึ่งได้กะพีคเกินทีมมาก: ลบกลาง
- วันหยุดไม่สมดุล: ลบกลาง
- ชั่วโมงรวมต่างกันมาก: ลบกลาง
- จัดคนเกินความจำเป็น: ลบน้อยถึงกลาง

## ตัวจำลองจัดกะ

ตัวจำลองควรรับข้อมูลเหล่านี้:

- สาขา
- เดือนและปี
- รายชื่อพนักงานที่ active
- แผนกของพนักงาน
- กะที่แต่ละแผนกทำได้
- วันว่างจาก `EmployeeAvailability`
- ตารางกะเดิม ถ้ามี
- requirement จาก Fuel Station
- rule วันหยุดประจำสัปดาห์ของแผนก
- จำนวนวันหยุดขั้นต่ำต่อคน
- เพดานวันทำงานติดกัน

ผลลัพธ์ควรเป็น draft schedule ที่ยังไม่เขียนทับของจริง

หน้าจอควรแสดงผลเทียบก่อนและหลังจำลอง

ผู้จัดการควรเห็นว่าระบบแก้ปัญหาอะไร เช่น เติมคนช่วง 08:00-10:00 ให้สาขาวัชรเกียรติ หรือกระจายกะพีคจากพนักงานคนเดิมไปคนอื่น

## ขั้นตอนการจัดกะจริง

ขั้นที่ 1 ดึง workload จาก `fuel-station`

เรียก `GET /api/labor-analytics?days=90`

แปลงข้อมูลรายชั่วโมงเป็น requirement รายสาขาและรายกะ

ขั้นที่ 2 สร้าง requirement

สร้างจำนวนคนที่ต้องใช้ของแต่ละสาขาในแต่ละกะ

แยกขั้นต่ำของหน้าลานและแคชเชียร์ถ้าข้อมูลแยกพอ

ขั้นที่ 3 สร้าง candidate schedule

ใช้พนักงานที่อยู่สาขานั้นและ active เท่านั้น

ตัดคนที่แจ้ง `UNAVAILABLE`

ลดคะแนนคนที่แจ้ง `PREFERRED_OFF`

ลงกะตาม allowed shift ของแผนก

คุมจำนวนวันทำงานติดกัน

คุมวันหยุดขั้นต่ำ

กระจายกะพีคให้ไม่ตกกับคนเดิม

ขั้นที่ 4 คำนวณ fairness score

ให้คะแนนภาพรวมทั้งสาขาและคะแนนรายคน

แสดงเหตุผลของ penalty แบบอ่านเข้าใจง่าย

ขั้นที่ 5 ให้ผู้จัดการแก้มือ

เปิดตาราง draft ให้ลากหรือแก้ทีละช่องได้

ทุกครั้งที่แก้ ระบบคำนวณคะแนนใหม่ทันที

ขั้นที่ 6 กด apply

เมื่อกด apply ระบบค่อยบันทึกลง `ShiftAssignment`

ต้องมี preview ว่าจะเพิ่ม แก้ หรือลบ assignment กี่รายการ

ควรบันทึก audit log ว่าใคร apply schedule รอบนี้

## API ที่ควรเพิ่มใน `timetrack`

`GET /api/admin/staffing-requirements`

ใช้ดู requirement ของสาขาและเดือน

`POST /api/admin/staffing-requirements/sync`

ใช้ดึง workload จาก `fuel-station` แล้วคำนวณ requirement ใหม่

`POST /api/admin/schedule/simulate`

ใช้สร้าง draft schedule พร้อม fairness score

`GET /api/admin/schedule/simulations`

ใช้ดู simulation เก่าของสาขาและเดือน

`POST /api/admin/schedule/simulations/[id]/apply`

ใช้บันทึก draft schedule ลง `ShiftAssignment`

`GET /api/admin/schedule/fairness`

ใช้ดูคะแนน fairness ของตารางที่ใช้อยู่จริง

## UI ที่ควรเพิ่ม

เพิ่มแท็บในหน้า `/admin/shifts`

แท็บ `Demand`

แสดงว่าสาขาไหนต้องใช้คนกี่คนในแต่ละกะ

แท็บ `Simulator`

เลือกสาขา เดือน กติกา แล้วกดจำลอง

แท็บ `Fairness`

แสดงคะแนนรวม ปัญหาใหญ่ และคะแนนรายคน

ในตารางกะเดิมควรเพิ่ม badge:

- ขาดคน
- คนเกิน
- กะพีค
- ฝืนวันหยุด
- คนนี้ได้กะหนักเกินเฉลี่ย

## เฟสการทำงาน

### เฟส 1: อ่าน demand จาก Fuel Station

ทำ endpoint sync requirement จาก `GET /api/labor-analytics`

แปลงข้อมูล hourly เป็น requirement รายกะ

ยังไม่ต้อง auto assign

ผลลัพธ์ของเฟสนี้คือผู้จัดการเห็นว่าสาขาไหนต้องการคนกี่คนในแต่ละช่วง

### เฟส 2: Fairness Index สำหรับตารางที่มีอยู่

คำนวณคะแนนจาก `ShiftAssignment` ปัจจุบัน

แสดงปัญหารายคนและรายวัน

ผลลัพธ์ของเฟสนี้คือระบบตรวจตารางที่คนจัดเองได้

### เฟส 3: Schedule Simulator

สร้าง draft schedule จาก requirement และ availability

ยังไม่บันทึกจริงทันที

ผลลัพธ์ของเฟสนี้คือผู้จัดการลองจัดกะอัตโนมัติได้

### เฟส 4: Apply Draft Schedule

เพิ่มปุ่ม apply พร้อม diff ก่อนบันทึก

เขียนลง `ShiftAssignment`

บันทึก audit log

ผลลัพธ์ของเฟสนี้คือระบบจัดลงกะจริงได้

### เฟส 5: Auto-improve

หลังแก้มือ ระบบเสนอ swap หรือปรับคนให้คะแนนดีขึ้น

เชื่อมกับ `ShiftPool` และ `ShiftSwap`

ผลลัพธ์ของเฟสนี้คือระบบช่วยแก้ตารางเฉพาะจุดได้

## กติกาที่ควรรองรับตั้งแต่แรก

พนักงานที่แจ้ง `UNAVAILABLE` ห้ามลงกะ ยกเว้นผู้จัดการ override พร้อมเหตุผล

พนักงานที่แจ้ง `PREFERRED_OFF` ลงได้แต่มี penalty

พนักงานควรได้วันหยุดอย่างน้อยตามกติกาแผนก

ห้ามทำงานเกินจำนวนวันติดกันที่กำหนด

กะกลางคืนหรือกะปิดควรถูกกระจายให้ใกล้เคียงกัน

กะพีคควรถูกกระจายให้ใกล้เคียงกัน

คนใหม่หรือคนที่ยังไม่ชำนาญควรมี skill level เพื่อไม่ให้ระบบจัดไปอยู่ช่วงหนักลำพัง

## สิ่งที่ต้องตัดสินใจก่อนเริ่มทำ

ต้องกำหนด mapping ระหว่าง `fuel-station.station_id` แบบตัวเลขกับ `timetrack.Station.code`

ต้องกำหนดว่า frontyard ใน `timetrack.Department.isFrontYard` เทียบกับ workload ฝั่ง fuel-station ตรงแค่ไหน

ต้องกำหนด target transaction per worker ของแต่ละสาขา

ต้องกำหนดขั้นต่ำคนต่อสาขาต่อช่วงเวลา

ต้องกำหนดว่าใครมีสิทธิ์ apply schedule

## MVP ที่แนะนำ

MVP แรกควรทำเฉพาะหน้าลานก่อน

ใช้ข้อมูล transaction รายชั่วโมงย้อนหลัง 60-90 วัน

แปลงเป็น requirement รายกะ

คำนวณ fairness ของตารางที่มีอยู่

ให้ผู้จัดการเห็นว่าแต่ละวันขาดคนหรือเกินคน

ยังไม่ควร auto apply จนกว่าคะแนนและ requirement จะนิ่ง

MVP ถัดไปค่อยเพิ่ม simulation และปุ่ม apply
