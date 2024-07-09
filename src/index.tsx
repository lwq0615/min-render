import { renderRoot } from "../core";

function Test2(props: any) {
  return <div>{props.children}</div>;
}

function Test() {
  this.useCreated(() => {
    this.count = 0;
  });
  this.useMounted(() => {
    this.count++;
  });
  return (
    <div id="a1">
      <div><span>{this.count}</span></div>
      {
        this.count % 2 > 0 && <div>123</div>
      }
      <button onClick={() => this.count++}>+++</button>
      {
        this.count % 2 == 0 && <div>333</div>
      }
    </div>
  );
}

renderRoot(<Test />, document.getElementById("app"));
