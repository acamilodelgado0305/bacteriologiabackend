const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Estudiante = sequelize.define('Estudiante', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'usuarios', key: 'id' },
  },
  codigo_estudiante: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  semestre: {
    type: DataTypes.ENUM('noveno', 'decimo'),
    allowNull: false,
  },
  escenario_practica: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  ciudad_escenario: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  departamento_escenario: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  fecha_inicio_practica: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  fecha_fin_practica: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  docente_supervisor_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'usuarios', key: 'id' },
  },
}, {
  tableName: 'estudiantes',
});

module.exports = Estudiante;
