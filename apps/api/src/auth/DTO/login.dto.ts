import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Ingresa un email válido' })
    email: string;

    @IsString()
    @MinLength(1, { message: 'La contraseña es requerida' })
    password: string;
}