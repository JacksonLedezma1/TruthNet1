import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { Analysis } from './analysis.entity';
import { AnalysisService, ANALYSIS_QUEUE } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisProcessor } from './analysis.processor';
import { AnalyzerClientService } from './analyzer-client.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Analysis]),
        BullModule.registerQueue({ name: ANALYSIS_QUEUE }),
        /**
         * HttpModule registra el HttpService de Axios para este módulo.
         * timeout y maxRedirects como defaults — el cliente los puede sobreescribir
         * por request si necesita un timeout diferente (el LLM tarda más que el NER).
         */
        HttpModule.register({
            timeout: 60000,
            maxRedirects: 3,
        }),
    ],
    controllers: [AnalysisController],
    providers: [AnalysisService, AnalysisProcessor, AnalyzerClientService],
})
export class AnalysisModule { }