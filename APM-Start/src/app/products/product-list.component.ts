import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { BehaviorSubject, catchError, combineLatest, EMPTY, map, Observable, of, Subject } from 'rxjs';
import { ProductCategory } from '../product-categories/product-category';
import { ProductCategoryService } from '../product-categories/product-category.service';

import { Product } from './product';
import { ProductService } from './product.service';

@Component({
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent  {
  pageTitle = 'Product List';
  errorMessageSubject =  new Subject<string>();
  errorMessageAction$ = this.errorMessageSubject.asObservable();
  categories$ = this.productCategoryService.productCategories$;

  private categorySelectedSubject = new BehaviorSubject<number>(0);
  categorySelectedAction$ = this.categorySelectedSubject.asObservable(); 
  

  constructor(private productService: ProductService,
    private productCategoryService: ProductCategoryService) { }

  products$ = combineLatest([
    this.productService.productsWithAdd$,
    this.categorySelectedAction$
  ]) .pipe(
    map(([products,selectedCategoryId]) => 
      products.filter(product =>
        selectedCategoryId? product.categoryId === selectedCategoryId:true)),
    catchError(err => {this.errorMessageSubject.next(err);
        return EMPTY; // or return of([]);
      })
  );
  
  // productSimpleFilter$ = this.productService.productWithCategory$
  // .pipe(
  //   map(products => 
  //     products.filter(product =>
  //       this.selectedCategoryId? product.categoryId === this.selectedCategoryId:true))
  // );

  

  onAdd(): void {
    //this.errorMessageSubject.next('Not yet implemented');
    this.productService.addProduct();
  }

  onSelected(categoryId: string): void {
    this.categorySelectedSubject.next(+categoryId);
  }
}
