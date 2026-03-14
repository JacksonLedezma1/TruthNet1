import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    Matches,
} from 'class-validator';

/**
 * DTO (Data Transfer Object): define y valida la forma exacta
 * que debe tener el JSON que llega en el body del request.
 *
 * El ValidationPipe global (configurado en main.ts) rechaza
 * automáticamente cualquier request que no cumpla estas reglas.
 * Esto protege contra entradas maliciosas antes de que lleguen al servicio.
 */
export class CreateUserDto {
    @IsEmail({}, { message: 'Ingresa un email válido' })
    email: string;

    @IsString()
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(50, { message: 'El nombre no puede superar 50 caracteres' })
    name: string;

    /**
     * La contraseña debe tener mínimo 8 caracteres, una mayúscula,
     * una minúscula y un número. El Regex lo valida en un solo paso.
     * No almacenamos la contraseña en texto plano nunca —
     * el @BeforeInsert de la entidad la hashea antes de guardar.
     */
    @IsString()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
        message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
    })
    password: string;
}