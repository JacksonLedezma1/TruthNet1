import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { UsersService } from './users.service';

@Module({
    /**
     * forFeature([User]) registra la entidad en este módulo
     * y hace disponible el repositorio para inyectar con @InjectRepository.
     */
    imports: [TypeOrmModule.forFeature([User])],
    providers: [UsersService],
    exports: [UsersService], // AuthModule lo necesita
})
export class UsersModule { }