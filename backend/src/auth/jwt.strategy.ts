import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from './roles.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(){
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET não definido nas variáveis de ambiente');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: any){
        const validRoles = Object.values(Role);
        if (!payload.role || !validRoles.includes(payload.role)) {
            throw new UnauthorizedException('Ocorreu um erro inesperado');
        }
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}