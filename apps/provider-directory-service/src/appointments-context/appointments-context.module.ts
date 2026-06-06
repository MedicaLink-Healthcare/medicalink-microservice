import { Module } from '@nestjs/common';
import { AppointmentsContextController } from './appointments-context.controller';
import { AppointmentsContextService } from './appointments-context.service';
import { BookedSlotsConsumer } from './booked-slots.consumer';
import { DoctorsModule } from '../doctors/doctors.module';
import { SpecialtiesModule } from '../specialties/specialties.module';
import { WorkLocationsModule } from '../work-locations/work-locations.module';
import { MicroserviceClientsModule } from '../clients/microservice-clients.module';
import { RedisModule } from '@app/redis';

@Module({
  imports: [
    DoctorsModule,
    SpecialtiesModule,
    WorkLocationsModule,
    MicroserviceClientsModule,
    RedisModule,
  ],
  controllers: [AppointmentsContextController, BookedSlotsConsumer],
  providers: [AppointmentsContextService],
})
export class AppointmentsContextModule {}
