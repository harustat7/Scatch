const jwt = require("jsonwebtoken");

const generatetoken = function(user) {
    return jwt.sign({ email: user.email, id: user._id }, process.env.JWT_KEY, { expiresIn: "7d" });
}

module.exports.generatetoken = generatetoken;
