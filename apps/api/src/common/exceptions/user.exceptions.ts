import { BadRequestException, NotFoundException } from '@nestjs/common';

export class UserEmailAlreadyExistsException extends BadRequestException {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor(id: number) {
    super(`User with ID ${id} not found`);
  }
}