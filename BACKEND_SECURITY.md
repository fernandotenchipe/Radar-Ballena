# Backend Security Implementation Guide

Este archivo describe qué cambios debe hacer el backend para soportar la seguridad mejorada de RadarBallena.

## 1. Autenticación con Cookies httpOnly

### Cambio: Login endpoint debe retornar cookie httpOnly

**Endpoint**: `POST /api/auth/login`

**Request** (sin cambios):
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (sin cambios):
```json
{
  "ok": true,
  "user": {
    "email": "user@example.com",
    "role": "user"
  }
}
```

**IMPORTANTE - Cambio de seguridad**: En lugar de retornar el token en el JSON:
```json
// ❌ NUNCA hagas esto
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Debes setear una cookie httpOnly**:
```
Set-Cookie: auth-token=eyJhbGciOiJIUzI1NiIs...; 
  HttpOnly; 
  Secure;        # HTTPS only
  SameSite=Lax;  # CSRF protection
  Path=/api;
  Max-Age=7200   # 2 horas (mismo que el cliente)
```

### Implementación recomendada (pseudo-código):

```javascript
// Node.js / Express ejemplo
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Validar credenciales
  const user = await validateLogin(email, password);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  }
  
  // Generar JWT
  const token = jwt.sign(
    { email: user.email, userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
  
  // ✅ CORRECTO: Setear como cookie httpOnly
  res.cookie('auth-token', token, {
    httpOnly: true,      // No accesible desde JavaScript (protege contra XSS)
    secure: true,        // Solo HTTPS
    sameSite: 'lax',     // CSRF protection
    path: '/api',
    maxAge: 2 * 60 * 60 * 1000  // 2 horas
  });
  
  return res.json({ 
    ok: true, 
    user: { email: user.email, role: user.role } 
  });
});
```

## 2. CSRF Protection

### Nuevo endpoint: Obtener CSRF token

**Endpoint**: `GET /api/csrf-token`

**Response**:
```json
{
  "token": "base64-encoded-random-token"
}
```

**Implementación recomendada**:

```javascript
app.get('/api/csrf-token', (req, res) => {
  // Generar token CSRF aleatorio
  const token = crypto.randomBytes(32).toString('hex');
  
  // Almacenar en sesión/base de datos asociado con el cliente
  // (uso session store, Redis, o similar)
  req.session.csrfToken = token;
  
  return res.json({ token });
});
```

### Validar CSRF en requests POST/PUT/DELETE

**Header esperado**: `X-CSRF-Token: <token>`

**Implementación**:

```javascript
app.use((req, res, next) => {
  // Solo validar en requests que modifiquen estado
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfHeader = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;
    
    if (!csrfHeader || csrfHeader !== sessionToken) {
      return res.status(403).json({ 
        ok: false, 
        error: 'CSRF token inválido' 
      });
    }
  }
  
  next();
});
```

## 3. Autenticación en Requests

### Cambio: Leer token de cookies en lugar de headers

**Antes** (❌ vulnerable):
```javascript
// Backend esperaba:
Authorization: Bearer <token-from-localStorage>
// Usuario podía ser robado con XSS
```

**Ahora** (✅ seguro):
```javascript
// Backend lee automáticamente de cookies
app.use((req, res, next) => {
  const token = req.cookies['auth-token'];  // httpOnly, protegida contra XSS
  
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ ok: false, error: 'Token inválido' });
    }
  }
  
  next();
});
```

## 4. Logout endpoint

**Endpoint**: `POST /api/auth/logout`

**Implementación**:

```javascript
app.post('/api/auth/logout', (req, res) => {
  // Limpiar cookie
  res.clearCookie('auth-token', { 
    path: '/api',
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  });
  
  // Limpiar sesión CSRF
  if (req.session) {
    req.session.csrfToken = null;
  }
  
  return res.json({ ok: true });
});
```

## 5. CORS Configuration

**Importante**: Debe estar configurado correctamente para soportar cookies

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,  // e.g., 'http://localhost:3000'
  credentials: true,                  // ✅ Permite enviar/recibir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  maxAge: 86400
}));
```

## 6. Endpoints que necesitan autenticación

Todos los siguientes deben validar que el usuario esté autenticado (JWT en cookie):

- `GET /api/alerts`
- `GET /api/channels`
- `GET /api/stats`
- `POST /api/translate-alerts` - ✅ Agregar validación de usuario
- `GET /api/csrf-token` - ✅ Accesible sin auth

## 7. Seguridad adicional

### Protecciones recomendadas:

1. **Rate limiting en login**:
   ```javascript
   // Limitar a 5 intentos por IP en 15 minutos
   const rateLimit = require('express-rate-limit');
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5
   });
   ```

2. **Revolver CSRF token después de login**:
   ```javascript
   // Generar nuevo CSRF token después de login exitoso
   req.session.csrfToken = crypto.randomBytes(32).toString('hex');
   ```

3. **HTTPS obligatorio en producción**:
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     app.use((req, res, next) => {
       if (req.header('x-forwarded-proto') !== 'https') {
         return res.redirect(`https://${req.header('host')}${req.url}`);
       }
       next();
     });
   }
   ```

## 8. Headers de seguridad

Agregar middleware para headers HTTP de seguridad:

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 año
    includeSubDomains: true,
    preload: true
  }
}));
```

## 9. Testing

Verificar que:

- ✅ Login setea cookie con `HttpOnly`, `Secure`, `SameSite`
- ✅ CSRF token se obtiene correctamente en `GET /api/csrf-token`
- ✅ Requests sin CSRF token válido retornan 403
- ✅ Requests sin cookie auth retornan 401
- ✅ Logout limpia la cookie
- ✅ Token expira después de 2 horas
- ✅ CORS permite credenciales desde el frontend

## 10. Checklist de migración

- [ ] Implementar `GET /api/csrf-token`
- [ ] Modificar `POST /api/auth/login` para retornar cookie httpOnly
- [ ] Agregar `POST /api/auth/logout`
- [ ] Implementar middleware de CSRF validation
- [ ] Configurar CORS con `credentials: true`
- [ ] Leer token de cookies en lugar de Authorization header
- [ ] Agregar rate limiting en login
- [ ] Agregar security headers
- [ ] Probar con cliente (RadarBallena frontend)
- [ ] Verificar HTTPS en producción
