import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './users.entity';
import { CreateUserDto } from './DTO/create-user.dto';

@Injectable()
export class UsersService {
    /**
     * @InjectRepository inyecta el repositorio de TypeORM para la entidad User.
     * El repositorio es el objeto que habla con la base de datos.
     * Nunca hacemos queries SQL directas — usamos los métodos del repositorio.
     */
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });

        /**
         * ConflictException lanza HTTP 409.
         * Es más semántico que un 400 para este caso:
         * el recurso ya existe, hay un conflicto con el estado actual.
         */
        if (existingUser) {
            throw new ConflictException('El email ya está registrado');
        }

        const user = this.userRepository.create(createUserDto);
        return this.userRepository.save(user);
        // El @BeforeInsert de la entidad encripta la contraseña automáticamente aquí
    }

    async findByEmail(email: string): Promise<User | null> {
        /**
         * addSelect('user.password') recupera la contraseña aunque tenga select:false.
         * Solo se hace en el contexto de autenticación, nunca en responses públicas.
         */
        return this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
            .getOne();
    }

    async findById(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        return user;
    }

    async setCurrentRefreshToken(refreshToken: string, userId: string) {
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.userRepository.update(userId, { hashedRefreshToken });
    }

    async getUserIfRefreshTokenMatches(refreshToken: string, userId: string): Promise<User | null> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user || !user.hashedRefreshToken) {
            return null;
        }

        const isRefreshTokenMatching = await bcrypt.compare(
            refreshToken,
            user.hashedRefreshToken,
        );

        if (isRefreshTokenMatching) {
            return user;
        }
        
        return null;
    }

    async removeRefreshToken(userId: string) {
        return this.userRepository.update(userId, {
            hashedRefreshToken: null,
        });
    }
}