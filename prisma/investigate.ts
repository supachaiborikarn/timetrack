import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Searching for user 'น้ำ' (Nam)...");
  
  // Find Nam
  const nam = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: 'น้ำ' } },
        { nickName: { contains: 'น้ำ' } },
      ]
    }
  });

  if (!nam) {
    console.log("Could not find user containing 'น้ำ' in the name or nickName.");
    // try to just print all users with some form of 'nam'
    const others = await prisma.user.findMany({ select: { name: true, nickName: true } });
    console.log(others.slice(0, 10)); // just display a few to see what they look like
    return;
  }

  console.log(`Found user: ${nam.name} (Nickname: ${nam.nickName}, ID: ${nam.id}, EmployeeID: ${nam.employeeId})`);
  console.log(`Current registered device ID: ${nam.deviceId || 'NONE'}`);

  // Get recent attendances
  const attendances = await prisma.attendance.findMany({
    where: {
      userId: nam.id,
    },
    orderBy: {
      date: 'desc'
    },
    take: 10,
    include: {
      checkInStation: true
    }
  });

  if (attendances.length === 0) {
    console.log("No attendances found.");
  } else {
    console.log("\n--- Nam's Recent Attendances ---");
    attendances.forEach((a, i) => {
      console.log(`\n[${i+1}] Date: ${a.date.toISOString().split('T')[0]}`);
      console.log(`    Check-In Time: ${a.checkInTime ? a.checkInTime.toISOString() : 'N/A'}`);
      console.log(`    Station: ${a.checkInStation?.name || 'N/A'} (expected lat: ${a.checkInStation?.latitude || 'N/A'}, lng: ${a.checkInStation?.longitude || 'N/A'}, radius: ${a.checkInStation?.radius || 'N/A'})`);
      console.log(`    Submitted Lat/Lng: ${a.checkInLat}, ${a.checkInLng}`);
      console.log(`    Submitted Device ID: ${a.checkInDeviceId || 'NONE'}`);
      console.log(`    Method: ${a.checkInMethod || 'NONE'}`);
    });
  }

  // Find if anyone else is using the SAME deviceId around the same time
  if (attendances.length > 0) {
    const activeDeviceIds = attendances
        .map(a => a.checkInDeviceId)
        .filter(id => id); // non-null
    
    if (activeDeviceIds.length > 0) {
        console.log("\n--- Checking if Device IDs are shared with other users ---");
        const sharedDevices = await prisma.attendance.findMany({
            where: {
                checkInDeviceId: { in: activeDeviceIds },
                userId: { not: nam.id }
            },
            include: {
                user: true
            },
            orderBy: {
                date: 'desc'
            },
            take: 10
        });

        if (sharedDevices.length > 0) {
            console.log("⚠️ WARNING: FOUND SHARED DEVICE USAGE (Buddy Punching Suspected) ⚠️");
            sharedDevices.forEach(sd => {
                console.log(`    Date: ${sd.date.toISOString().split('T')[0]}`);
                console.log(`    User: ${sd.user.name} (Nick: ${sd.user.nickName})`);
                console.log(`    Device ID: ${sd.checkInDeviceId}`);
            });
        } else {
            console.log("No evidence of shared Device ID found in recent attendances.");
        }
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
