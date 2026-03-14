import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../users/users.entity';

/**
 * Cada estado representa un paso visible en la UI.
 * El orden importa: van de menos a más procesado.
 * FAILED puede ocurrir en cualquier punto del pipeline.
 */
export enum AnalysisStatus {
    PENDING = 'PENDING',    // Job creado, esperando en la cola
    EXTRACTING = 'EXTRACTING', // Python extrae claims del texto
    SCRAPING = 'SCRAPING',   // Python busca fuentes cruzadas
    ANALYZING = 'ANALYZING',  // LLM evalúa cada claim
    SCORING = 'SCORING',    // Se calcula el score final
    DONE = 'DONE',       // Análisis completo
    FAILED = 'FAILED',     // Error en algún paso
}

@Entity('analyses')
export class Analysis {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * ManyToOne: muchos análisis pertenecen a un usuario.
     * onDelete: 'CASCADE' → si se borra el usuario, se borran sus análisis.
     * eager: false → no carga el usuario en cada query (lo pedimos explícitamente).
     */
    @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: string;

    // El texto o URL que el usuario envió a analizar
    @Column({ type: 'text' })
    input: string;

    @Column({
        type: 'enum',
        enum: AnalysisStatus,
        default: AnalysisStatus.PENDING,
    })
    status: AnalysisStatus;

    /**
     * El resultado final en formato JSON.
     * type: 'jsonb' es específico de PostgreSQL y permite hacer
     * queries dentro del JSON (útil para filtrar por score, por ejemplo).
     * nullable: true porque solo existe cuando status === DONE.
     */
    @Column({ type: 'jsonb', nullable: true })
    result: Record<string, unknown> | null;

    // Mensaje de error si el job falla, para mostrarlo en la UI
    @Column({ type: 'text', nullable: true })
    errorMessage: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}