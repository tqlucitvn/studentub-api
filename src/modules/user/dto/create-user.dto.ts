import { Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BaseUserResDto } from 'src/modules/user/dto/user-res.dto';
import { UserRoleEnum } from 'src/roles/roles.enum';

export class CreateUserDto extends BaseUserResDto {
  @MinLength(8)
  @MaxLength(32)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'password is too weak',
  })
  @ApiProperty()
  password: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  roles: UserRoleEnum[];
}
