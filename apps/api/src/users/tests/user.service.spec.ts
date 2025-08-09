import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../application/services/user.service';

describe('UserService', () => {
  let service: UserService;

  const mockRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: 'USER_REPOSITORY',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return null when user not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeNull();
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return user when found', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      mockRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow('User with ID 1 not found');
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return user when found', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      mockRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });
  });
});
