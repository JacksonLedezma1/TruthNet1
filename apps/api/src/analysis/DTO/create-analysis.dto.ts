import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateAnalysisDto {
    /**
     * El usuario puede pegar texto libre o una URL.
     * El microservicio Python detecta qué es y actúa en consecuencia.
     * MinLength(20): evitar análisis de textos triviales sin contenido.
     * MaxLength(5000): limitar el tamaño para no sobrecargar el pipeline.
     */
    @IsString()
    @MinLength(20, { message: 'El texto debe tener al menos 20 caracteres' })
    @MaxLength(5000, { message: 'El texto no puede superar 5000 caracteres' })
    input: string;
}