const jwt = require('jsonwebtoken');

//Signs a JSON Web Token (JWT) with the provided data and expiration time.
const jwtSign = (user, secret, expires) => new Promise((resolve, reject) => {
    const payload = { id: user._id, role: user.role };
    const options = {
        expiresIn: expires,
    };
    jwt.sign(payload, secret, options, (err, data) => {
        if (err) reject(new Error(err));
        resolve(data);
    });
});

module.exports = { jwtSign }