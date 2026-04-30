const User = require('./User');
const Estudiante = require('./Estudiante');

// Relaciones
User.hasOne(Estudiante, { foreignKey: 'usuario_id', as: 'perfil_estudiante' });
Estudiante.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

User.hasMany(Estudiante, { foreignKey: 'docente_supervisor_id', as: 'estudiantes_supervisados' });
Estudiante.belongsTo(User, { foreignKey: 'docente_supervisor_id', as: 'docente_supervisor' });

module.exports = { User, Estudiante };
