import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { BehaviorSubject, catchError, combineLatest, filter, forkJoin, from, map, merge,
   mergeMap,
   Observable, of, scan, shareReplay, Subject, switchMap, tap, throwError, toArray } from 'rxjs';

import { Product } from './product';
import { ProductCategory } from '../product-categories/product-category';
import { ProductCategoryService } from '../product-categories/product-category.service';
import { SupplierService } from '../suppliers/supplier.service';
import { Supplier } from '../suppliers/supplier';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsUrl = 'api/products';
  private suppliersUrl = 'api/suppliers';
  private productCategoriesUrl = 'api/productCategories';
  constructor(private http: HttpClient,
     private productCategoryService: ProductCategoryService,
     private supplierService: SupplierService) { }

  //productCategories$=this.http.get<ProductCategory[]>(this.productCategoriesUrl);
  products$ =this.http.get<Product[]>(this.productsUrl)
  .pipe(
    // map(items=> items.map(
    //   item => ({
    //     ...item,
    //     myNumber : items.indexOf(item)+1,
    //     searchKey: [item.productName],
    //     price : item.price * 1.5
    //   })as Product)),
    tap(data => console.log('Products: ', JSON.stringify(data))),
    catchError(this.handleError)
  );

  productWithCategory$ = combineLatest([
    this.products$,
    this.productCategoryService.productCategories$
  ]).pipe(
    map(([products,categories]) =>
      products.map(
        product => ({
            ...product,
            myNumber : products.indexOf(product)+1,
            searchKey: [product.productName],
            price : product.price * 1.5,
            category: categories.find(c =>product.categoryId === c.id)?.name
        }) as Product )),
        shareReplay(1)
  );

  private productSelectedSubject = new BehaviorSubject<number>(0);
  productSelectedAction$ = this.productSelectedSubject.asObservable();

  selectedProduct$ = combineLatest([
     this.productWithCategory$,
     this.productSelectedAction$
  ]).pipe(
    map(([products,selectedId]) => 
      products.find(p=>p.id ===selectedId))
  );
//GET IT ALL
  selectedProductSuppliers_1$ = combineLatest([
    this.selectedProduct$,
    this.supplierService.suppliers$
  ]).pipe(
    map(([selectedProduct,suppliers]) => 
      suppliers.filter(s=> selectedProduct?.supplierIds?.includes(s.id))
    )
  );
//JUST IN TIME
  selectedProductSuppliers_2$ = this.selectedProduct$
    .pipe(
      filter(selectedProduct => Boolean(selectedProduct)),
      switchMap(
        selectedProduct => 
        from(selectedProduct?.supplierIds ?? of())
          .pipe(
            mergeMap(supplierId => this.http.get<Supplier>(`${this.suppliersUrl}/${supplierId}`)),
            toArray()
          )
      )
    )
    //JUST IN TIME
    selectedProductSuppliers$ = this.selectedProduct$
    .pipe(
      filter(product => Boolean(product)),
      switchMap(selectedProduct => {
        if (selectedProduct?.supplierIds) {
          return forkJoin(selectedProduct.supplierIds.map(supplierId =>
            this.http.get<Supplier>(`${this.suppliersUrl}/${supplierId}`)))
        } else {
          return of([]);
        }
      }),
      tap(suppliers => console.log('product suppliers', JSON.stringify(suppliers)))
    );
  selectedProductChanged(id:number):void{
    this.productSelectedSubject.next(id);
  }

  private productInsertedSubject = new Subject<Product>();
  productInsertedAction$ = this.productInsertedSubject.asObservable();

  productsWithAdd$ = merge(
    this.productWithCategory$,
    this.productInsertedAction$)
    .pipe(
      //scan((acc:Product[], value:Product) => [...acc,value])
      //scan((acc:Product[],curr:Product)=>{ acc.push(curr); return acc; })
      // scan((acc, value) =>
      // {
      //   if(value instanceof Array) return [...value]
      //   else{ 
      //       acc.map(product =>({
      //         ...product,
      //         myNumber:acc.indexOf(product)+1
      //       }));
      //     return [...acc, value]
      //   }
      //     //return (value instanceof Array) ? [...value] : [...acc, value];
      // }, [] as Product[])
       scan((acc, value) =>
       (value instanceof Array) ? [...value] : [...acc, value], [] as Product[]),
       map(products=> 
        products.map(product => ({
          ...product,
            myNumber : products.indexOf(product)+1,
            searchKey: [product.productName]
        }))
        )
    )

  private fakeProduct(): Product {
    return {
      id: 42,
      productName: 'Another One',
      productCode: 'TBX-0042',
      description: 'Our new product',
      price: 8.9,
      categoryId: 3,
      // category: 'Toolbox',
      quantityInStock: 30
    };
  }
addProduct(newProduct?:Product){
  newProduct = newProduct || this.fakeProduct();
  this.productInsertedSubject.next(newProduct)
}
  private handleError(err: HttpErrorResponse): Observable<never> {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage: string;
    if (err.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `An error occurred: ${err.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      errorMessage = `Backend returned code ${err.status}: ${err.message}`;
    }
    console.error(err);
    return throwError(() => errorMessage);
  }

}
