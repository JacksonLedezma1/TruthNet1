import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';

/**
 * @Entity() le dice a TypeORM que esta clase es una tabla en la base de datos.
 * Cada propiedad decorada con @Column() es una columna.
 */
@Entity('users')
export class User {
    /**
     * UUID como clave primaria: más seguro que un ID numérico autoincremental.
     * Con IDs numéricos un atacante puede adivinar /users/1, /users/2, etc.
     * Con UUID eso es imposible.
     */
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 100 })
    email: string;

    @Column({ length: 50 })
    name: string;

    /**
     * select: false significa que esta columna NO se incluye en las consultas
     * por defecto. Para obtenerla hay que pedirla explícitamente.
     * @Exclude() asegura que si logramos obtenerla de la BD (ej. en el auth service),
     * nunca se envíe serializada en la respuesta JSON al cliente.
     */
    @Column({ select: false })
    @Exclude()
    password: string;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    hashedRefreshToken: string | null;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    resetPasswordToken: string | null;

    @Column({ type: 'timestamp', nullable: true })
    @Exclude()
    resetPasswordExpires: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    /**
     * @BeforeInsert y @BeforeUpdate son hooks de TypeORM.
     * Se ejecutan automáticamente antes de insertar o actualizar el registro.
     * Aquí encriptamos la contraseña con bcrypt (12 rondas de salt).
     *
     * bcrypt es el estándar para contraseñas porque:
     * - Es lento por diseño (costoso de fuerza bruta)
     * - Incluye el salt en el hash (no necesitas columna salt separada)
     * - El número de rondas (12) es configurable según la potencia del servidor
     */
    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword(): Promise<void> {
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 12);
        }
    }

    /**
     * Método para comparar contraseñas: recibe el texto plano
     * y lo compara con el hash almacenado. bcrypt.compare nunca
     * expone el hash ni la contraseña original.
     */
    async validatePassword(plainPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, this.password);
    }
}