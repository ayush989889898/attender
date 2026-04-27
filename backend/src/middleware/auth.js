import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

/**
 * Attaches req.user from JWT. Use after this for protected routes.
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user.toObject();
    req.auth = { sub: decoded.sub, role: user.role };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden for this role' });
    }
    return next();
  };
}
