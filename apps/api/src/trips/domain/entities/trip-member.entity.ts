import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../users/domain/entities/user.entity';
import { Trip } from './trip.entity';

export enum TripMemberRole {
  OWNER = 'owner',
  COLLABORATOR = 'collaborator',
  VIEWER = 'viewer',
}

export enum TripMemberStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

@Entity('trip_members')
export class TripMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tripId: number;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: TripMemberRole,
    default: TripMemberRole.VIEWER,
  })
  role: TripMemberRole;

  @Column({
    type: 'enum',
    enum: TripMemberStatus,
    default: TripMemberStatus.PENDING,
  })
  status: TripMemberStatus;

  @CreateDateColumn()
  invitedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @ManyToOne(() => Trip, trip => trip.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}
