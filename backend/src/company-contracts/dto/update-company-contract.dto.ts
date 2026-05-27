import { PartialType } from '@nestjs/swagger';
import { CreateCompanyContractDto } from './create-company-contract.dto';

export class UpdateCompanyContractDto extends PartialType(CreateCompanyContractDto) {}
