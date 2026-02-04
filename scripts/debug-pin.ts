
const bcrypt = require('bcryptjs');

const targetHash = '$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK';

async function main() {
    console.log(`Testing hash: ${targetHash}`);

    const c1 = await bcrypt.compare('1234', targetHash);
    console.log(`Compare '1234': ${c1}`);

    const c2 = await bcrypt.compare('123456', targetHash);
    console.log(`Compare '123456': ${c2}`);

    const c3 = await bcrypt.compare('password', targetHash);
    console.log(`Compare 'password': ${c3}`);

    const c4 = await bcrypt.compare('0000', targetHash);
    console.log(`Compare '0000': ${c4}`);
}

main();
