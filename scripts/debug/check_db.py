import psycopg2
from urllib.parse import unquote

# Connect to database
conn = psycopg2.connect(
    host='aws-1-ap-southeast-1.pooler.supabase.com',
    port=5432,
    database='postgres',
    user='postgres.knrqdfawnrehqvkczogm',
    password=unquote('Bigbcoffee2010%21')
)
cur = conn.cursor()

# Get all users
print('=== ALL USERS ===')
cur.execute('''
    SELECT "id", "employeeId", "name", "phone", "role", "isActive" 
    FROM "User" 
    ORDER BY "role", "name"
''')
rows = cur.fetchall()
print(f'Total users: {len(rows)}')
print()
for row in rows:
    id_short = row[0][:12] + '...' if len(row[0]) > 12 else row[0]
    print(f'EmpID: {row[1]:10} | Name: {row[2]:20} | Phone: {row[3]:12} | Role: {row[4]:10} | Active: {row[5]}')

print()
print('=== STATIONS ===')
cur.execute('SELECT "id", "code", "name" FROM "Station"')
stations = cur.fetchall()
print(f'Total stations: {len(stations)}')
for s in stations:
    print(f'Code: {s[1]} | Name: {s[2]}')

print()
print('=== DEPARTMENTS ===')
cur.execute('SELECT "id", "code", "name", "stationId" FROM "Department"')
depts = cur.fetchall()
print(f'Total departments: {len(depts)}')

conn.close()
