const User = require("../models/users.model");

module.exports = function requireRoleOrSelf(allowedRoles = []) {
  return async (req, res, next) => {
    const roles = req.user?.realm_access?.roles || [];
    const keycloakId = req.user?.sub;
    const mongoId = req.params.id;

    // 1) If user has allowed role → allow
    const hasRole = allowedRoles.some(role => roles.includes(role));
    if (hasRole) return next();

    // 2) Check if this MongoDB user belongs to this Keycloak user
    const user = await User.findById(mongoId);

    if (user && user.keycloak_id === keycloakId) {
      return next();
    }

    // 3) Otherwise → deny
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have permission to access this resource"
    });
  };
};
