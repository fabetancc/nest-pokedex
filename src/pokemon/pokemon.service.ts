import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class PokemonService {

  private defaultLimit: number;

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService
  ) {
    this.defaultLimit = configService.get<number>('defaultLimit');
  }

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLowerCase();
    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto);
      return pokemon;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  findAll(paginationDto: PaginationDto) {

    const { limit = this.defaultLimit, offset = 0 } = paginationDto;

    return this.pokemonModel.find()
      .limit(limit)
      .skip(offset)
      .sort({no: 1})
      .select('-__v');
  }

  async findOne(term: string): Promise<Pokemon> {

    let pokemon: Pokemon;

    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: term });
    }

    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term);
    }

    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term.toLowerCase().trim() });
    }

    if (!pokemon) throw new NotFoundException(`Pokemon with id, name or No "${term}" not found`);

    return pokemon;

  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {

    const pokemon: Pokemon = await this.findOne(term);

    if (updatePokemonDto.name) {
      updatePokemonDto.name = updatePokemonDto.name.toLowerCase();
    }

    try {

      await pokemon.updateOne(updatePokemonDto, { new: true });

      return {
        ...pokemon.toJSON(), ...updatePokemonDto
      };

    } catch (error) {
      this.handleExceptions(error);
    }


  }

  async remove(id: string) {

    // const pokemon: Pokemon = await this.findOne(id);
    // await pokemon.deleteOne();
    // return pokemon;
    // const pokemon = await this.pokemonModel.findByIdAndDelete(id);

    const { deletedCount } = await this.pokemonModel.deleteOne({ _id: id });
    if (deletedCount === 0)
      throw new BadRequestException('Sent id doesn\'t exists');

    return { deletedCount };
  }

  private handleExceptions(error: any): void {
    if (error.code === 11000) {
      throw new BadRequestException(`Pokemon already exists: ${JSON.stringify(error.keyValue)}`);
    }
    throw new InternalServerErrorException(`Couldn't update Pokemon - Check server logs`);
  }


  public get pokeModel(): Model<Pokemon> {
    return this.pokemonModel;
  }


}
