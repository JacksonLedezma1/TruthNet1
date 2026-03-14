import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Analysis } from './analysis.entity';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisProcessor } from './analysis.processor';
import { ANALYSIS_QUEUE } from './analysis.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Analysis]),

        /**
         * BullModule.registerQueue registra la cola 'analysis' en Redis.
         * La conexión a Redis se configura una sola vez en app.module.ts
         * con BullModule.forRootAsync — aquí solo declaramos el nombre.
         */
        BullModule.registerQueue({ name: ANALYSIS_QUEUE }),
    ],
    controllers: [AnalysisController],
    providers: [AnalysisService, AnalysisProcessor],
})
export class AnalysisModule { }