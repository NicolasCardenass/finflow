import { Global, Module } from "@nestjs/common";
import { CategoriesController } from "./categories.controller.js";
import { CategoriesService } from "./categories.service.js";

@Global()
@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
